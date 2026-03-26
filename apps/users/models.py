from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    role = models.CharField(
        max_length=40,
        choices=[('student', 'Студент'), ('teacher', 'Учитель'), ('admin', 'Админ')],
        default= 'student'
    )
    level = models.PositiveIntegerField(default=1)
    experience = models.PositiveIntegerField(default=0)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    def add_experience(self, points):
        self.experience += points
        self.save()