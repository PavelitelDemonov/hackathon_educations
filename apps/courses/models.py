from django.db import models

# Create your models here.
class Module(models.Model):
    name = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)
    description = models.TextField()

class Lesson(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    content = models.TextField()
    order = models.PositiveIntegerField(default=0)
    video_url = models.URLField(blank=True)

class UserProgress(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    module = models.ForeignKey(Module, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    score = models.FloatField(null=True, blank=True)


class Achievement(models.Model):
    name = models.CharField(max_length=100)
    xp_required = models.PositiveIntegerField()
    badge_icon = models.CharField(max_length=200, blank=True)

class UserAchievement(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    date_unlocked = models.DateTimeField(auto_now_add=True)
