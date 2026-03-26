from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated , AllowAny, IsAdminUser
from rest_framework import generics, status, viewsets
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.views import APIView
from .serializers import RegisterSerializers, ProfileSerializer, LoginSerializer
from .models import User


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
    
"""
class ProtectedView(RoleRequiredMixin,APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        user = request.user
        return Response({
            "message": "This is a protected endpoint by manager",
            "user_id": user.id,
            "username": user.email,
            "is_authenticated": user.is_authenticated,
            'role': user.role,
            'data': 'Ваши защищенные данные здесь'
        })
"""
class AdminModuleViewSet(viewsets.ModelViewSet):
    permission_classes =[IsAdminUser]

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
    

    