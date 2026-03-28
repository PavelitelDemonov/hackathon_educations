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
    child_username = models.CharField(max_length=150, blank=True, default="")

    email = models.CharField(blank=True, null=True)

    @staticmethod
    def experience_required_for_level(level):
        target_level = max(1, int(level))
        if target_level <= 1:
            return 0
        # Пороги: до 2 уровня — 100 XP, дальше +50 XP к следующему уровню.
        # Пример: L2=100, L3=250, L4=450, L5=700 ...
        total = 0
        for next_level in range(2, target_level + 1):
            total += 100 + (next_level - 2) * 50
        return total

    def calculate_level(self):
        xp = max(0, int(self.experience or 0))
        level = 1
        while xp >= self.experience_required_for_level(level + 1):
            level += 1
        return level


    def add_experience(self, points):
        try:
            normalized_points = int(points or 0)
        except (TypeError, ValueError):
            normalized_points = 0
        self.experience = max(0, self.experience + normalized_points)
        self.level = self.calculate_level()
        self.save()
