from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .models import Achievement, Lesson, Module, UserAchievement, UserProgress
from .progress_services import (
    MODULE_XP as DEFAULT_MODULE_XP,
    SLIDE_XP as DEFAULT_SLIDE_XP,
    ensure_base_achievements,
    evaluate_and_unlock_achievements,
    lesson_slides_count,
    normalize_viewed_slide_indexes,
)
from .serializer import LessonSerializer, ModuleSerializer, UserProgressSerializer


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
