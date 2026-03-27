from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Lesson, Module, UserProgress
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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_xp(request):
    try:
        points = int(request.data.get("points", 0))
    except (TypeError, ValueError):
        points = 0
    request.user.add_experience(points)
    return Response(
        {
            "xp": request.user.experience,
            "level": request.user.level,
            "message": f"+{points} XP!",
        }
    )


class CompleteLessonView(APIView):
    throttle_scope = "lesson_complete"
    throttle_classes = [ScopedRateThrottle]
    permission_classes = [IsAuthenticated]

    LESSON_XP = 5
    MODULE_XP = 20

    def post(self, request, lesson_id):
        lesson = get_object_or_404(Lesson, id=lesson_id)
        progress = (
            UserProgress.objects.filter(user=request.user, lesson=lesson).order_by("id").first()
        )
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

        first_completion = not progress.completed
        if first_completion:
            progress.completed = True
            update_fields.append("completed")
            request.user.add_experience(self.LESSON_XP)

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
                request.user.add_experience(self.MODULE_XP)
                module_reward_granted = True

        if update_fields:
            progress.save(update_fields=update_fields)

        return Response(
            {
                "success": True,
                "already_completed": not first_completion,
                "lesson": {
                    "id": lesson.id,
                    "title": lesson.title,
                    "xp_granted": self.LESSON_XP if first_completion else 0,
                },
                "module": {
                    "id": lesson.module_id,
                    "name": lesson.module.name,
                    "completed_lessons": completed_lessons,
                    "total_lessons": total_lessons,
                    "completed": module_completed,
                    "reward_granted": module_reward_granted,
                    "module_xp_granted": self.MODULE_XP if module_reward_granted else 0,
                },
                "progress": {
                    "id": progress.id,
                    "completed": progress.completed,
                    "score": progress.score,
                    "module_reward_granted": progress.module_reward_granted,
                },
                "user": {
                    "xp": request.user.experience,
                    "level": request.user.level,
                },
            }
        )
