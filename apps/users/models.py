from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = [('student', 'Студент'), ('teacher', 'Учитель'), ('admin', 'Админ'), ('parent', 'Родитель')]
    role = models.CharField(
        max_length=40,
        choices=ROLE_CHOICES,
        default= 'student'
    )
    level = models.PositiveIntegerField(default=1)
    experience = models.PositiveIntegerField(default=0)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    email = models.CharField(blank=True, null=True)

    def calculate_level(self):
        import math
        return max(1, int(math.sqrt(self.experience / 100))) #переделать


    def add_experience(self, points):
        self.experience += points
        self.level = self.calculate_level()
        self.save()