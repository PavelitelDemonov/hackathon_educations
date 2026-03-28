from rest_framework import  serializers
from django.contrib.auth import get_user_model
from .models import Module, Lesson, UserProgress

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

