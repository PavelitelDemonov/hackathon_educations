from rest_framework import  serializers
from django.contrib.auth import get_user_model
from .models import Module, Lesson, LessonStep, UserProgress, UserStepProgress

User = get_user_model()

class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ['id', 'name', 'language', 'order', 'description']

class LessonSerializer(serializers.ModelSerializer):
    module = ModuleSerializer(read_only=True)
    steps = serializers.SerializerMethodField(read_only=True)
    module_id = serializers.PrimaryKeyRelatedField(
        queryset = Module.objects.all(), source ='module', write_only=True
    )

    def get_steps(self, obj):
        step_items = obj.steps.all().order_by('order', 'id')
        progress_map = {}
        request = self.context.get("request")
        if request and getattr(request, "user", None) and request.user.is_authenticated:
            progress_map = {
                item.step_id: item
                for item in UserStepProgress.objects.filter(
                    user=request.user,
                    step__in=step_items,
                )
            }
        serialized = []
        for step in step_items:
            step_progress = progress_map.get(step.id)
            serialized.append(
                {
                    "id": step.id,
                    "order": step.order,
                    "step_type": step.step_type,
                    "title": step.title,
                    "content": step.content,
                    "config": step.config,
                    "xp_reward": step.xp_reward,
                    "is_required": step.is_required,
                    "progress": {
                        "completed": bool(step_progress.completed) if step_progress else False,
                        "attempts": int(step_progress.attempts or 0) if step_progress else 0,
                        "score": step_progress.score if step_progress else None,
                        "completed_at": (
                            step_progress.completed_at.isoformat()
                            if step_progress and step_progress.completed_at
                            else None
                        ),
                    },
                }
            )
        return serialized
    
    class Meta:
        model = Lesson
        fields=['id','module','module_id', 'title', 'content', 'order', 'video_url', 'steps']

class UserProgressSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')
    lesson = LessonSerializer(read_only=True)
    lesson_id = serializers.PrimaryKeyRelatedField(
        queryset = Lesson.objects.all(), source='lesson', write_only=True
    )

    class Meta:
        model = UserProgress
        fields = [
            'id',
            'user',
            'module',
            'lesson',
            'lesson_id',
            'completed',
            'score',
            'viewed_slide_indexes',
            'slides_completed',
            'module_reward_granted',
        ]


class LessonStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonStep
        fields = [
            'id',
            'lesson',
            'order',
            'step_type',
            'title',
            'content',
            'config',
            'xp_reward',
            'is_required',
        ]


class UserStepProgressSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')
    step = LessonStepSerializer(read_only=True)
    step_id = serializers.PrimaryKeyRelatedField(
        queryset=LessonStep.objects.all(), source='step', write_only=True
    )

    class Meta:
        model = UserStepProgress
        fields = [
            'id',
            'user',
            'step',
            'step_id',
            'completed',
            'attempts',
            'answer_payload',
            'score',
            'completed_at',
        ]


class LessonStepWithProgressSerializer(serializers.ModelSerializer):
    progress = serializers.SerializerMethodField()

    class Meta:
        model = LessonStep
        fields = [
            'id',
            'lesson',
            'order',
            'step_type',
            'title',
            'content',
            'config',
            'xp_reward',
            'is_required',
            'progress',
        ]

    def get_progress(self, obj):
        progress_map = self.context.get('progress_map') or {}
        progress = progress_map.get(obj.id)
        if not progress:
            return {
                'completed': False,
                'attempts': 0,
                'score': None,
                'completed_at': None,
            }
        return {
            'completed': bool(progress.completed),
            'attempts': int(progress.attempts or 0),
            'score': progress.score,
            'completed_at': progress.completed_at.isoformat() if progress.completed_at else None,
        }

