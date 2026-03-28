from django.db import models

# Create your models here.
class Module(models.Model):
    name = models.CharField(max_length=200)
    language = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)
    description = models.TextField()

class Lesson(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    content = models.TextField()
    order = models.PositiveIntegerField(default=0)
    video_url = models.URLField(blank=True, null=True)


class LessonStep(models.Model):
    STEP_TYPE_THEORY = "theory"
    STEP_TYPE_PRACTICE_DRAG = "practice_drag"
    STEP_TYPE_PRACTICE_CODE = "practice_code"
    STEP_TYPE_QUIZ = "quiz"

    STEP_TYPE_CHOICES = [
        (STEP_TYPE_THEORY, "Теория"),
        (STEP_TYPE_PRACTICE_DRAG, "Практика: порядок"),
        (STEP_TYPE_PRACTICE_CODE, "Практика: код"),
        (STEP_TYPE_QUIZ, "Тест"),
    ]

    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="steps")
    order = models.PositiveIntegerField(default=0)
    step_type = models.CharField(max_length=40, choices=STEP_TYPE_CHOICES, default=STEP_TYPE_THEORY)
    title = models.CharField(max_length=200, blank=True, default="")
    content = models.TextField(blank=True, default="")
    config = models.JSONField(default=dict, blank=True)
    xp_reward = models.PositiveIntegerField(default=0)
    is_required = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "id"]
        unique_together = [("lesson", "order")]


class UserStepProgress(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    step = models.ForeignKey(LessonStep, on_delete=models.CASCADE, related_name="user_progress")
    completed = models.BooleanField(default=False)
    attempts = models.PositiveIntegerField(default=0)
    answer_payload = models.JSONField(default=dict, blank=True)
    score = models.FloatField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-completed_at", "-id"]
        unique_together = [("user", "step")]

class UserProgress(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    module = models.ForeignKey(Module, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    score = models.FloatField(null=True, blank=True)
    viewed_slide_indexes = models.JSONField(default=list, blank=True)
    slides_completed = models.PositiveIntegerField(default=0)
    module_reward_granted = models.BooleanField(default=False)


class Achievement(models.Model):
    name = models.CharField(max_length=100)
    xp_required = models.PositiveIntegerField()
    badge_icon = models.CharField(max_length=200, blank=True)

class UserAchievement(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    date_unlocked = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_unlocked", "-id"]
