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
    module_id = serializers.PrimaryKeyRelatedField(
        queryset = Module.objects.all(), source ='module', write_only=True
    )
    
    class Meta:
        model = Lesson
        fields=['id','module','module_id', 'title', 'content', 'order', 'video_url']

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

