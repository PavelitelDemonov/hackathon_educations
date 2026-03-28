from django.contrib import admin

from .models import Lesson, LessonStep, Module, UserProgress, UserStepProgress


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "language", "order")
    search_fields = ("name", "language")
    list_filter = ("language",)


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "module", "order")
    search_fields = ("title", "module__name")
    list_filter = ("module",)


@admin.register(LessonStep)
class LessonStepAdmin(admin.ModelAdmin):
    list_display = ("id", "lesson", "order", "step_type", "xp_reward", "is_required")
    search_fields = ("title", "lesson__title", "lesson__module__name")
    list_filter = ("step_type", "is_required", "lesson__module")
    ordering = ("lesson", "order", "id")


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "module", "lesson", "completed", "slides_completed")
    search_fields = ("user__username", "module__name", "lesson__title")
    list_filter = ("completed", "module")


@admin.register(UserStepProgress)
class UserStepProgressAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "step", "completed", "attempts", "score", "completed_at")
    search_fields = ("user__username", "step__title", "step__lesson__title")
    list_filter = ("completed", "step__step_type", "step__lesson__module")
