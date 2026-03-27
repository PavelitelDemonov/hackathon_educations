from rest_framework import generics, status 
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.throttling import UserRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView

from django.shortcuts import get_object_or_404

from apps.users.models import User
from django.shortcuts import render
from .models import Lesson, UserProgress

from .models import Module, Lesson, UserProgress
from .serializer import ModuleSerializer, LessonSerializer, UserProgressSerializer

# Create your views here.

class ModuleListView(generics.ListAPIView):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer
    permission_classes = [AllowAny]

class ModuleDetailView(generics.RetrieveAPIView):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer
    permission_classes = [AllowAny]

class LessonListView(generics.ListAPIView):
    serializer_class = ModuleSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        module_id = self.kwargs['module_id']
        return Lesson.objects.filter(module_id=module_id).order_by('order')
    

class LessonDetailView(generics.RetrieveAPIView):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [AllowAny]

class UserProgressListView(generics.ListCreateAPIView):
    serializer_class = UserProgressSerializer 
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserProgress.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class UserProgressDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProgressSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserProgress.objects.filter(user=self.request.user)
    
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_xp(request):
    points = request.data.get('points', 0)
    request.user.add_experience(points)
    return Response({
        'xp': request.user.experience,
        'level': request.user.level,
        'message': f'+{points} XP!'
    })


class CompleteLessonView(APIView):
    throttle_scope = 'lesson_complete'
    throttle_classes = [ScopedRateThrottle]
    permission_classes = [IsAuthenticated]
    def post(self, request):
        lesson_id = request.data.get('lesson_id')
    
        if not lesson_id:
            return Response({'error': 'lesson_id required'}, status=400)
        
        lesson = get_object_or_404(Lesson, id=lesson_id)
        
        progress, created = UserProgress.objects.get_or_create(
            user=request.user,
            lesson=lesson,
            defaults={
                'module': lesson.module,
                'completed': True, 
                'score': request.data.get('score', 85)  
            }
        )
        
        if not created:
            return Response({
                'error': 'Урок уже завершён!',
                'progress': {
                    'completed': progress.completed,
                    'score': progress.score
                }
            }, status=400)
        
        request.user.add_experience(15)
        
        return Response({
            'success': True,
            'message': f'Урок "{lesson.title}" завершён',
            'lesson': {
                'id': lesson.id,
                'title': lesson.title
            },
            'user': {
                'xp': request.user.experience,
                'level': request.user.level,
                'xp_to_next': request.user.xp_to_next_level()
            }
        })
