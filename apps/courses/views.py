from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .models import Achievement, Lesson, LessonStep, Module, UserAchievement, UserProgress, UserStepProgress
from .progress_services import (
    MODULE_XP as DEFAULT_MODULE_XP,
    SLIDE_XP as DEFAULT_SLIDE_XP,
    ensure_base_achievements,
    evaluate_and_unlock_achievements,
    lesson_slides_count,
    normalize_viewed_slide_indexes,
)
from .serializer import (
    LessonSerializer,
    LessonStepWithProgressSerializer,
    ModuleSerializer,
    UserProgressSerializer,
)


class ModuleListView(generics.ListAPIView):
    serializer_class = ModuleSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Module.objects.all()
        language = self.request.query_params.get("language")
        if language:
            queryset = queryset.filter(language__iexact=language.strip())
        return queryset


class ModuleDetailView(generics.RetrieveAPIView):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer
    permission_classes = [AllowAny]


class LessonListView(generics.ListAPIView):
    serializer_class = LessonSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        module_id = self.kwargs["module_id"]
        return Lesson.objects.filter(module_id=module_id).order_by("order")


class LessonDetailView(generics.RetrieveAPIView):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [AllowAny]


class LessonStepListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, lesson_id):
        lesson = get_object_or_404(Lesson, id=lesson_id)
        steps = LessonStep.objects.filter(lesson=lesson).order_by("order", "id")
        progress_map = {
            item.step_id: item
            for item in UserStepProgress.objects.filter(user=request.user, step__lesson=lesson).select_related("step")
        }
        data = LessonStepWithProgressSerializer(
            steps,
            many=True,
            context={"progress_map": progress_map},
        ).data
        return Response(
            {
                "lesson_id": lesson.id,
                "steps": data,
            }
        )


class SubmitLessonStepAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    def _normalize_list(self, raw_value):
        if not isinstance(raw_value, list):
            return []
        normalized = []
        for item in raw_value:
            text = str(item).strip()
            if text:
                normalized.append(text)
        return normalized

    def _sync_lesson_completion_from_steps(self, user, lesson):
        required_steps = LessonStep.objects.filter(lesson=lesson, is_required=True)
        required_total = required_steps.count()
        if required_total <= 0:
            return False

        completed_required = (
            UserStepProgress.objects.filter(
                user=user,
                step__in=required_steps,
                completed=True,
            )
            .values("step_id")
            .distinct()
            .count()
        )
        if completed_required < required_total:
            return False

        progress = UserProgress.objects.filter(user=user, lesson=lesson).order_by("id").first()
        if progress is None:
            progress = UserProgress.objects.create(user=user, module=lesson.module, lesson=lesson, completed=True)
            return True

        update_fields = []
        if progress.module_id != lesson.module_id:
            progress.module = lesson.module
            update_fields.append("module")
        if not progress.completed:
            progress.completed = True
            update_fields.append("completed")
        if update_fields:
            progress.save(update_fields=update_fields)
            return True
        return False

    def post(self, request, step_id):
        if request.user.role != "student":
            return Response({"detail": "Доступ только для учеников."}, status=status.HTTP_403_FORBIDDEN)

        step = get_object_or_404(LessonStep, id=step_id)
        progress, _ = UserStepProgress.objects.get_or_create(user=request.user, step=step)

        answer_payload = {}
        is_correct = False
        message = ""
        score = 0.0

        if step.step_type == LessonStep.STEP_TYPE_THEORY:
            mark_complete = bool(request.data.get("mark_complete", True))
            is_correct = mark_complete
            score = 1.0 if mark_complete else 0.0
            answer_payload = {"mark_complete": mark_complete}
            message = "Теоретический шаг отмечен как пройденный." if mark_complete else "Шаг не отмечен."

        elif step.step_type == LessonStep.STEP_TYPE_PRACTICE_DRAG:
            submitted_answer = self._normalize_list(request.data.get("answer", []))
            expected_answer = self._normalize_list(step.config.get("answer", []))
            answer_payload = {"answer": submitted_answer}
            is_correct = bool(expected_answer) and submitted_answer == expected_answer
            score = 1.0 if is_correct else 0.0
            message = "Верно! Порядок собран правильно." if is_correct else "Пока неверно, попробуй ещё раз."

        elif step.step_type == LessonStep.STEP_TYPE_QUIZ:
            submitted = str(request.data.get("answer", "")).strip()
            correct_answer = str(step.config.get("correct_answer", "")).strip()
            answer_payload = {"answer": submitted}
            is_correct = bool(correct_answer) and submitted == correct_answer
            score = 1.0 if is_correct else 0.0
            message = "Правильный ответ." if is_correct else "Ответ не совпал."

        elif step.step_type == LessonStep.STEP_TYPE_PRACTICE_CODE:
            submitted_code = str(request.data.get("answer", "")).strip()
            expected_code = str(step.config.get("expected_code", "")).strip()
            answer_payload = {"answer": submitted_code}
            is_correct = bool(expected_code) and submitted_code == expected_code
            score = 1.0 if is_correct else 0.0
            message = "Код принят." if is_correct else "Код не прошел проверку."

        else:
            return Response({"detail": "Неподдерживаемый тип шага."}, status=status.HTTP_400_BAD_REQUEST)

        progress.attempts = int(progress.attempts or 0) + 1
        progress.answer_payload = answer_payload
        progress.score = score

        xp_granted = 0
        if is_correct and not progress.completed:
            progress.completed = True
            progress.completed_at = timezone.now()
            xp_granted = int(step.xp_reward or 0)

        progress.save()

        lesson_completed_now = False
        if is_correct:
            lesson_completed_now = self._sync_lesson_completion_from_steps(request.user, step.lesson)

        new_achievements = []
        if xp_granted > 0:
            request.user.add_experience(xp_granted)
            new_achievements = evaluate_and_unlock_achievements(request.user)
        elif is_correct:
            new_achievements = evaluate_and_unlock_achievements(request.user)

        return Response(
            {
                "success": True,
                "step_id": step.id,
                "step_type": step.step_type,
                "is_correct": is_correct,
                "message": message,
                "progress": {
                    "completed": bool(progress.completed),
                    "attempts": int(progress.attempts or 0),
                    "score": progress.score,
                    "completed_at": progress.completed_at.isoformat() if progress.completed_at else None,
                },
                "xp_granted": xp_granted,
                "lesson_completed_now": lesson_completed_now,
                "user": {
                    "xp": request.user.experience,
                    "level": request.user.level,
                },
                "new_achievements": new_achievements,
            }
        )


class UserProgressListView(generics.ListCreateAPIView):
    serializer_class = UserProgressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserProgress.objects.filter(user=self.request.user).order_by("module_id", "lesson_id")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserProgressDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProgressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserProgress.objects.filter(user=self.request.user)


class ProgressSlidesBulkSyncView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != "student":
            return Response({"detail": "Доступ только для учеников."}, status=status.HTTP_403_FORBIDDEN)

        raw_lessons = request.data.get("lessons")
        if not isinstance(raw_lessons, list):
            return Response(
                {"detail": "Ожидался список lessons."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_items = []
        lesson_ids = []
        for item in raw_lessons:
            if not isinstance(item, dict):
                continue
            try:
                lesson_id = int(item.get("lesson_id"))
            except (TypeError, ValueError):
                continue
            if lesson_id <= 0:
                continue
            viewed_indexes = item.get("viewed_slide_indexes")
            if not isinstance(viewed_indexes, list):
                viewed_indexes = []
            normalized_items.append((lesson_id, viewed_indexes))
            lesson_ids.append(lesson_id)

        if not lesson_ids:
            progress_list = UserProgressSerializer(
                UserProgress.objects.filter(user=request.user).order_by("module_id", "lesson_id"),
                many=True,
            ).data
            return Response(
                {
                    "success": True,
                    "synced_lessons": 0,
                    "slides_added": 0,
                    "xp_granted": 0,
                    "progress": progress_list,
                    "user": {
                        "xp": request.user.experience,
                        "level": request.user.level,
                    },
                    "new_achievements": [],
                }
            )

        lessons_map = {
            lesson.id: lesson
            for lesson in Lesson.objects.filter(id__in=set(lesson_ids)).select_related("module")
        }
        existing_progress_map = {
            progress.lesson_id: progress
            for progress in UserProgress.objects.filter(
                user=request.user,
                lesson_id__in=lessons_map.keys(),
            ).order_by("id")
        }

        total_new_slides = 0
        changed_progress_ids = set()
        touched_module_ids = set()

        with transaction.atomic():
            for lesson_id, incoming_raw_indexes in normalized_items:
                lesson = lessons_map.get(lesson_id)
                if lesson is None:
                    continue

                progress = existing_progress_map.get(lesson_id)
                if progress is None:
                    progress = UserProgress.objects.create(
                        user=request.user,
                        lesson=lesson,
                        module=lesson.module,
                    )
                    existing_progress_map[lesson_id] = progress
                    changed_progress_ids.add(progress.id)

                update_fields = []
                if progress.module_id != lesson.module_id:
                    progress.module = lesson.module
                    update_fields.append("module")

                total_slides = lesson_slides_count(lesson)
                existing_indexes = normalize_viewed_slide_indexes(progress.viewed_slide_indexes, total_slides)
                incoming_indexes = normalize_viewed_slide_indexes(incoming_raw_indexes, total_slides)

                merged_set = set(existing_indexes)
                before_size = len(merged_set)
                merged_set.update(incoming_indexes)
                merged_indexes = sorted(merged_set)
                added_now = max(0, len(merged_indexes) - before_size)
                if added_now > 0:
                    total_new_slides += added_now

                if progress.viewed_slide_indexes != merged_indexes:
                    progress.viewed_slide_indexes = merged_indexes
                    update_fields.append("viewed_slide_indexes")

                slides_completed = len(merged_indexes)
                if progress.slides_completed != slides_completed:
                    progress.slides_completed = slides_completed
                    update_fields.append("slides_completed")

                if (not progress.completed) and slides_completed >= total_slides:
                    progress.completed = True
                    update_fields.append("completed")

                if update_fields:
                    progress.save(update_fields=update_fields)
                    changed_progress_ids.add(progress.id)
                touched_module_ids.add(lesson.module_id)

            module_reward_granted_ids = []
            for module_id in touched_module_ids:
                total_lessons = Lesson.objects.filter(module_id=module_id).count()
                if total_lessons <= 0:
                    continue
                completed_lessons = (
                    UserProgress.objects.filter(
                        user=request.user,
                        module_id=module_id,
                        completed=True,
                    )
                    .values("lesson_id")
                    .distinct()
                    .count()
                )
                if completed_lessons < total_lessons:
                    continue

                if UserProgress.objects.filter(
                    user=request.user,
                    module_id=module_id,
                    module_reward_granted=True,
                ).exists():
                    continue

                first_progress = (
                    UserProgress.objects.filter(user=request.user, module_id=module_id)
                    .order_by("id")
                    .first()
                )
                if first_progress is None:
                    continue
                first_progress.module_reward_granted = True
                first_progress.save(update_fields=["module_reward_granted"])
                module_reward_granted_ids.append(first_progress.id)

            total_xp_granted = total_new_slides * DEFAULT_SLIDE_XP
            if total_xp_granted > 0:
                request.user.add_experience(total_xp_granted)

            new_achievements = evaluate_and_unlock_achievements(request.user)

        if module_reward_granted_ids:
            changed_progress_ids.update(module_reward_granted_ids)

        progress_list = UserProgressSerializer(
            UserProgress.objects.filter(user=request.user).order_by("module_id", "lesson_id"),
            many=True,
        ).data
        return Response(
            {
                "success": True,
                "synced_lessons": len(normalized_items),
                "slides_added": total_new_slides,
                "xp_granted": total_xp_granted,
                "updated_progress_ids": sorted(changed_progress_ids),
                "progress": progress_list,
                "user": {
                    "xp": request.user.experience,
                    "level": request.user.level,
                },
                "new_achievements": new_achievements,
            }
        )


class AchievementListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ensure_base_achievements()
        unlocked_map = {
            item.achievement_id: item.date_unlocked
            for item in UserAchievement.objects.filter(user=request.user).select_related("achievement")
        }
        achievements = Achievement.objects.all().order_by("xp_required", "id")
        data = []
        for achievement in achievements:
            unlocked_at = unlocked_map.get(achievement.id)
            data.append(
                {
                    "id": achievement.id,
                    "code": achievement.badge_icon,
                    "name": achievement.name,
                    "xp_required": achievement.xp_required,
                    "unlocked": bool(unlocked_at),
                    "unlocked_at": unlocked_at.isoformat() if unlocked_at else None,
                }
            )
        return Response(data)


class UnlockPvzCupAchievementView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != "student":
            return Response({"detail": "Доступ только для учеников."}, status=status.HTTP_403_FORBIDDEN)

        achievement_map = ensure_base_achievements()
        achievement = achievement_map.get("pvz_cup")
        if achievement is None:
            return Response({"detail": "Достижение не найдено."}, status=status.HTTP_404_NOT_FOUND)

        user_achievement = UserAchievement.objects.filter(user=request.user, achievement=achievement).first()
        created = False
        if user_achievement is None:
            user_achievement = UserAchievement.objects.create(user=request.user, achievement=achievement)
            created = True

        return Response(
            {
                "success": True,
                "already_unlocked": not created,
                "new_achievements": (
                    [
                        {
                            "id": achievement.id,
                            "code": achievement.badge_icon,
                            "name": achievement.name,
                        }
                    ]
                    if created
                    else []
                ),
                "achievement": {
                    "id": achievement.id,
                    "code": achievement.badge_icon,
                    "name": achievement.name,
                    "xp_required": achievement.xp_required,
                    "unlocked": True,
                    "unlocked_at": (
                        user_achievement.date_unlocked.isoformat() if user_achievement and user_achievement.date_unlocked else None
                    ),
                },
                "user": {
                    "xp": request.user.experience,
                    "level": request.user.level,
                },
            }
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_xp(request):
    try:
        points = int(request.data.get("points", 0))
    except (TypeError, ValueError):
        points = 0
    request.user.add_experience(points)
    unlocked = evaluate_and_unlock_achievements(request.user)
    return Response(
        {
            "xp": request.user.experience,
            "level": request.user.level,
            "message": f"+{points} XP!",
            "new_achievements": unlocked,
        }
    )


class CompleteLessonView(APIView):
    class LessonCompleteThrottle(UserRateThrottle):
        # Локальный лимит не зависит от DEFAULT_THROTTLE_RATES в settings.py.
        rate = "120/min"

    throttle_classes = [LessonCompleteThrottle]
    permission_classes = [IsAuthenticated]

    SLIDE_XP = DEFAULT_SLIDE_XP
    MODULE_XP = DEFAULT_MODULE_XP

    def post(self, request, lesson_id):
        if request.user.role != "student":
            return Response({"detail": "Доступ только для учеников."}, status=status.HTTP_403_FORBIDDEN)

        lesson = get_object_or_404(Lesson, id=lesson_id)
        progress = UserProgress.objects.filter(user=request.user, lesson=lesson).order_by("id").first()
        if progress is None:
            progress = UserProgress.objects.create(
                user=request.user,
                lesson=lesson,
                module=lesson.module,
            )

        update_fields = []
        if progress.module_id != lesson.module_id:
            progress.module = lesson.module
            update_fields.append("module")

        score = request.data.get("score")
        if score is not None and progress.score is None:
            try:
                progress.score = float(score)
                update_fields.append("score")
            except (TypeError, ValueError):
                pass

        total_slides = lesson_slides_count(lesson)
        viewed_indexes = normalize_viewed_slide_indexes(progress.viewed_slide_indexes, total_slides)
        viewed_indexes_set = set(viewed_indexes)

        slide_index_raw = request.data.get("slide_index")
        slide_index = None
        try:
            if slide_index_raw is not None and str(slide_index_raw).strip() != "":
                slide_index = int(slide_index_raw)
        except (TypeError, ValueError):
            slide_index = None

        slide_xp_granted = 0
        if slide_index is not None and 0 <= slide_index < total_slides and slide_index not in viewed_indexes_set:
            viewed_indexes_set.add(slide_index)
            slide_xp_granted += self.SLIDE_XP

        normalized_indexes = sorted(viewed_indexes_set)
        if progress.viewed_slide_indexes != normalized_indexes:
            progress.viewed_slide_indexes = normalized_indexes
            update_fields.append("viewed_slide_indexes")

        slides_completed = len(normalized_indexes)
        if progress.slides_completed != slides_completed:
            progress.slides_completed = slides_completed
            update_fields.append("slides_completed")

        lesson_completed_before = progress.completed
        if (not progress.completed) and slides_completed >= total_slides:
            progress.completed = True
            update_fields.append("completed")

        if update_fields:
            progress.save(update_fields=update_fields)
            update_fields = []

        module_xp_granted = 0
        total_lessons = Lesson.objects.filter(module=lesson.module).count()
        completed_lessons = (
            UserProgress.objects.filter(
                user=request.user,
                module=lesson.module,
                completed=True,
            )
            .values("lesson_id")
            .distinct()
            .count()
        )
        module_completed = total_lessons > 0 and completed_lessons >= total_lessons
        module_reward_granted = False
        if module_completed:
            module_reward_already_granted = UserProgress.objects.filter(
                user=request.user,
                module=lesson.module,
                module_reward_granted=True,
            ).exists()
            if not module_reward_already_granted:
                progress.module_reward_granted = True
                update_fields.append("module_reward_granted")
                module_xp_granted = self.MODULE_XP
                module_reward_granted = True

        total_xp_granted = slide_xp_granted + module_xp_granted
        if total_xp_granted > 0:
            request.user.add_experience(total_xp_granted)

        if update_fields:
            progress.save(update_fields=update_fields)

        new_achievements = evaluate_and_unlock_achievements(request.user)

        return Response(
            {
                "success": True,
                "already_completed": lesson_completed_before,
                "slide": {
                    "index": slide_index,
                    "xp_granted": slide_xp_granted,
                    "slides_completed": slides_completed,
                    "total_slides": total_slides,
                },
                "lesson": {
                    "id": lesson.id,
                    "title": lesson.title,
                    "completed": progress.completed,
                    "xp_granted": total_xp_granted,
                },
                "module": {
                    "id": lesson.module_id,
                    "name": lesson.module.name,
                    "completed_lessons": completed_lessons,
                    "total_lessons": total_lessons,
                    "completed": module_completed,
                    "reward_granted": module_reward_granted,
                    "module_xp_granted": module_xp_granted,
                },
                "progress": {
                    "id": progress.id,
                    "completed": progress.completed,
                    "score": progress.score,
                    "viewed_slide_indexes": progress.viewed_slide_indexes,
                    "slides_completed": progress.slides_completed,
                    "module_reward_granted": progress.module_reward_granted,
                },
                "user": {
                    "xp": request.user.experience,
                    "level": request.user.level,
                },
                "new_achievements": new_achievements,
            }
        )
