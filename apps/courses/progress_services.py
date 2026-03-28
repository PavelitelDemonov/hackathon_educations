import re

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q

from .models import Achievement, Lesson, LessonStep, UserAchievement, UserProgress


SLIDE_XP = 10
MODULE_XP = 0


BASE_ACHIEVEMENTS = [
    {"code": "first_slide", "name": "Первый шаг", "xp_required": 0},
    {"code": "slides_10", "name": "10 слайдов пройдено", "xp_required": 0},
    {"code": "slides_30", "name": "30 слайдов пройдено", "xp_required": 0},
    {"code": "first_lesson", "name": "Первый урок завершён", "xp_required": 0},
    {"code": "first_module", "name": "Первый модуль завершён", "xp_required": 0},
    {"code": "pvz_cup", "name": "Где мои семена, Дейв?", "xp_required": 0},
    {"code": "level_2", "name": "Уровень 2 достигнут", "xp_required": 100},
    {"code": "level_5", "name": "Уровень 5 достигнут", "xp_required": 700},
]


def normalize_lesson_text(raw_content):
    text = str(raw_content or "")
    if ("\n" not in text) and ("\\n" in text):
        text = text.replace("\\r\\n", "\n").replace("\\n", "\n").replace("\\r", "\n")
    return text.replace("\r\n", "\n").replace("\r", "\n")


def split_lesson_sections(raw_content):
    content = normalize_lesson_text(raw_content).strip()
    if not content:
        return []
    content = re.sub(r"\s---+\s", "\n---\n", content)
    parts = [chunk.strip() for chunk in re.split(r"\n\s*---+\s*\n", content) if chunk.strip()]
    return parts or [content]


def lesson_slides_count(lesson):
    steps_count = LessonStep.objects.filter(lesson=lesson).count()
    if steps_count > 0:
        return steps_count

    sections = split_lesson_sections(lesson.content)
    return max(1, len(sections))


def normalize_viewed_slide_indexes(raw_indexes, total_slides):
    safe_total = max(1, int(total_slides or 1))
    normalized = []
    seen = set()
    if not isinstance(raw_indexes, list):
        return normalized
    for item in raw_indexes:
        try:
            index = int(item)
        except (TypeError, ValueError):
            continue
        if index < 0 or index >= safe_total or index in seen:
            continue
        seen.add(index)
        normalized.append(index)
    normalized.sort()
    return normalized


def ensure_base_achievements():
    achievements = {}
    for item in BASE_ACHIEVEMENTS:
        achievement = Achievement.objects.filter(badge_icon=item["code"]).order_by("id").first()
        if achievement is None:
            achievement = Achievement.objects.create(
                badge_icon=item["code"],
                name=item["name"],
                xp_required=item["xp_required"],
            )
        changed = False
        if achievement.name != item["name"]:
            achievement.name = item["name"]
            changed = True
        if achievement.xp_required != item["xp_required"]:
            achievement.xp_required = item["xp_required"]
            changed = True
        if changed:
            achievement.save(update_fields=["name", "xp_required"])
        achievements[item["code"]] = achievement
    return achievements


def total_viewed_slides_for_user(user):
    total = 0
    progress_items = UserProgress.objects.filter(user=user).only("viewed_slide_indexes")
    for progress in progress_items:
        unique_indexes = normalize_viewed_slide_indexes(progress.viewed_slide_indexes, 10_000)
        total += len(unique_indexes)
    return total


def total_completed_modules_for_user(user):
    completed_module_ids = (
        UserProgress.objects.filter(user=user, completed=True)
        .values_list("module_id", flat=True)
        .distinct()
    )
    completed_modules_count = 0
    for module_id in completed_module_ids:
        total_lessons = Lesson.objects.filter(module_id=module_id).count()
        if total_lessons <= 0:
            continue
        completed_lessons = (
            UserProgress.objects.filter(
                user=user,
                module_id=module_id,
                completed=True,
            )
            .values("lesson_id")
            .distinct()
            .count()
        )
        if completed_lessons >= total_lessons:
            completed_modules_count += 1
    return completed_modules_count


def unlock_user_achievement(user, achievement, unlocked_list):
    exists = UserAchievement.objects.filter(user=user, achievement=achievement).exists()
    if not exists:
        UserAchievement.objects.create(user=user, achievement=achievement)
        unlocked_list.append(
            {
                "id": achievement.id,
                "code": achievement.badge_icon,
                "name": achievement.name,
            }
        )


def evaluate_and_unlock_achievements(user):
    achievement_map = ensure_base_achievements()
    unlocked = []

    total_slides = total_viewed_slides_for_user(user)
    completed_lessons_count = (
        UserProgress.objects.filter(user=user, completed=True).values("lesson_id").distinct().count()
    )
    completed_modules_count = total_completed_modules_for_user(user)

    if total_slides >= 1:
        unlock_user_achievement(user, achievement_map["first_slide"], unlocked)
    if total_slides >= 10:
        unlock_user_achievement(user, achievement_map["slides_10"], unlocked)
    if total_slides >= 30:
        unlock_user_achievement(user, achievement_map["slides_30"], unlocked)
    if completed_lessons_count >= 1:
        unlock_user_achievement(user, achievement_map["first_lesson"], unlocked)
    if completed_modules_count >= 1:
        unlock_user_achievement(user, achievement_map["first_module"], unlocked)
    if user.experience >= 100:
        unlock_user_achievement(user, achievement_map["level_2"], unlocked)
    if user.experience >= 700:
        unlock_user_achievement(user, achievement_map["level_5"], unlocked)

    return unlocked


def normalize_user_progress_rows(user):
    updated_rows = 0
    total_slides = 0
    completed_module_ids = set()

    progress_rows = (
        UserProgress.objects.filter(user=user)
        .select_related("lesson")
        .order_by("id")
    )

    for progress in progress_rows:
        lesson = progress.lesson
        lesson_total_slides = lesson_slides_count(lesson)

        normalized_indexes = normalize_viewed_slide_indexes(progress.viewed_slide_indexes, lesson_total_slides)

        # Старые записи могли иметь completed=True, но без трекинга слайдов.
        # Для backfill считаем такой урок полностью просмотренным.
        if progress.completed and len(normalized_indexes) < lesson_total_slides:
            normalized_indexes = list(range(lesson_total_slides))

        slides_completed = len(normalized_indexes)
        row_updates = []

        if progress.viewed_slide_indexes != normalized_indexes:
            progress.viewed_slide_indexes = normalized_indexes
            row_updates.append("viewed_slide_indexes")
        if progress.slides_completed != slides_completed:
            progress.slides_completed = slides_completed
            row_updates.append("slides_completed")

        if slides_completed >= lesson_total_slides and not progress.completed:
            progress.completed = True
            row_updates.append("completed")

        if row_updates:
            progress.save(update_fields=row_updates)
            updated_rows += 1

        total_slides += slides_completed
        if progress.completed and progress.module_id:
            completed_module_ids.add(progress.module_id)

    return {
        "updated_rows": updated_rows,
        "slides_completed": total_slides,
        "completed_modules": len(completed_module_ids),
    }


@transaction.atomic
def backfill_user_progress_xp_and_achievements(user):
    progress_summary = normalize_user_progress_rows(user)

    target_xp = (
        progress_summary["slides_completed"] * SLIDE_XP
        + progress_summary["completed_modules"] * MODULE_XP
    )
    old_xp = int(user.experience or 0)
    xp_added = max(0, target_xp - old_xp)

    if xp_added > 0:
        user.add_experience(xp_added)
    else:
        # Если XP не меняем, все равно обновим уровень на случай ручных правок в БД.
        recalculated_level = user.calculate_level()
        if user.level != recalculated_level:
            user.level = recalculated_level
            user.save(update_fields=["level"])

    unlocked = evaluate_and_unlock_achievements(user)

    return {
        "user_id": user.id,
        "username": user.username,
        "progress_rows_updated": progress_summary["updated_rows"],
        "slides_completed": progress_summary["slides_completed"],
        "completed_modules": progress_summary["completed_modules"],
        "target_xp": target_xp,
        "xp_before": old_xp,
        "xp_added": xp_added,
        "xp_after": int(user.experience or 0),
        "level_after": int(user.level or 1),
        "achievements_unlocked": len(unlocked),
        "new_achievements": unlocked,
    }


def backfill_all_students():
    User = get_user_model()
    users_with_progress_ids = UserProgress.objects.values_list("user_id", flat=True).distinct()
    students = (
        User.objects.filter(Q(role="student") | Q(id__in=users_with_progress_ids))
        .distinct()
        .order_by("id")
    )
    results = []
    for student in students:
        results.append(backfill_user_progress_xp_and_achievements(student))
    return results
