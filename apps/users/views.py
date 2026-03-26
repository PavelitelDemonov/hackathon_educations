from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated , AllowAny, IsAdminUser
from rest_framework import generics, status, viewsets
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.views import APIView

from .serializers import RegisterSerializers, ProfileSerializer, LoginSerializer, CustomTokenObtainPairView
from .models import User
from .permissions import IsStudent, IsTeacher, IsAdmin



class RegisterView(generics.CreateAPIView):
  
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializers

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        headers = self.get_success_headers(serializer.data)
       
        return Response({
            "message": "Регистрация пользователя прошла успешно",
            "user_id": user.id,
            'role': user.role
        }, status=status.HTTP_201_CREATED, headers=headers) 

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = ProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class LoginView(CustomTokenObtainPairView):
    pass

class StudentDashboard(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        return Response({
            "message": "Студенческая панель",
            "user": {
                "username": request.user.username,
                "level": request.user.level,
                "xp": request.user.experience
            }
        })
    
class TeacherDashboard(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get(self, request):
        return Response({
            "message": "Панель учителя",
            "students_count": User.objects.filter(role='student').count()
        })

class AdminDashboard(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get(self, request):
        return Response({
            "message": "Админ панель",
            "total_users": User.objects.count(),
            "user_roles": dict(User.objects.values_list('role').annotate(count=Count('role')))
        })
    

class LoginView(CustomTokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.data.get('access'):
            response.set_cookie(
                'access_token',
                response.data['access'],
                max_age=60*60*24,
                httponly=True,
                samesite='Lax',
                secure=True     #поменять на False на прод
            )
            response.set_cookie(
                'refresh_token',
                response.data['refresh'],
                max_age=60*60*24*7,
                httponly=True,
                samesite='Lax'
            )
        return response
    