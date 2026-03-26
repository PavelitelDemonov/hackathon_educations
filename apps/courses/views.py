from rest_framework import generics, status 
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from apps.users.models import User
from django.shortcuts import render

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