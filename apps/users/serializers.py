from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.password_validation import validate_password

from .models import User


class RegisterSerializers(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'password_confirm', 'role'] 
    
    def create(self, validated_data):
       return User.objects.create_user(**validated_data)

    def validate_role(self, value):
        allowed_roles = ['student', 'parent', 'teacher']
        if value not in allowed_roles:
            raise serializers.ValidationError("Только для студентов/родителей/учителей")
        return value
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Пароли не совпадают")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user
    
class ProfileSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    avatar_url = serializers.SerializerMethodField(read_only=True)

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return ""
        request = self.context.get("request")
        if request is None:
            return obj.avatar.url
        return request.build_absolute_uri(obj.avatar.url)

    def validate_child_username(self, value):
        normalized = str(value or "").strip()
        request = self.context.get("request")
        actor = getattr(request, "user", None) or self.instance
        actor_role = getattr(actor, "role", "")

        if normalized and actor_role != "parent":
            raise serializers.ValidationError("Поле ребёнка доступно только родителю.")
        if self.instance and normalized and normalized == self.instance.username:
            raise serializers.ValidationError("Нельзя указать себя как ребёнка.")
        return normalized

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'child_username',
            'avatar',
            'avatar_url',
            'role',
            'role_display',
            'level',
            'experience',
            'date_joined',
        ]
        read_only_fields = [
            'id',
            'username',
            'role',
            'role_display',
            'level',
            'experience',
            'date_joined',
            'avatar_url',
        ]

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField() 
    password = serializers.CharField(write_only=True)

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Добавляем role/level в JWT payload!
        token['role'] = user.role
        token['level'] = user.level # проверить что будет с пользователем если ты поменяешь роль или уровень вне авторизации пользователя
        token['username'] = user.username
        return token    

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    password = serializers.CharField(write_only=True)
