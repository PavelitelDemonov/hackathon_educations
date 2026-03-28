from django.db import migrations


PRACTICE_TITLE = "Практика: собери print()"
PRACTICE_CONTENT = (
    "Перетащи кусочки в правильном порядке, чтобы получилась команда "
    '`print("Привет, мир!")`.'
)
PRACTICE_CONFIG = {
    "tokens": ['"Привет, мир!")', "print("],
    "answer": ["print(", '"Привет, мир!")'],
}


def next_order_for_lesson(LessonStep, lesson, preferred_order):
    used_orders = set(
        LessonStep.objects.filter(lesson=lesson).values_list("order", flat=True)
    )
    candidate = int(preferred_order or 1)
    while candidate in used_orders:
        candidate += 1
    return candidate


def forwards(apps, schema_editor):
    Lesson = apps.get_model("courses", "Lesson")
    LessonStep = apps.get_model("courses", "LessonStep")

    lessons = Lesson.objects.filter(title__icontains="урок 1").order_by("id")
    for lesson in lessons:
        already_exists = False
        for existing_step in LessonStep.objects.filter(
            lesson=lesson,
            step_type="practice_drag",
        ):
            config = existing_step.config or {}
            if list(config.get("answer") or []) == list(PRACTICE_CONFIG["answer"]):
                already_exists = True
                break
        if already_exists:
            continue

        order = next_order_for_lesson(LessonStep, lesson, preferred_order=12)
        LessonStep.objects.create(
            lesson=lesson,
            order=order,
            step_type="practice_drag",
            title=PRACTICE_TITLE,
            content=PRACTICE_CONTENT,
            config=PRACTICE_CONFIG,
            xp_reward=0,
            is_required=True,
        )


def backwards(apps, schema_editor):
    Lesson = apps.get_model("courses", "Lesson")
    LessonStep = apps.get_model("courses", "LessonStep")

    lessons = Lesson.objects.filter(title__icontains="урок 1").order_by("id")
    for lesson in lessons:
        for step in LessonStep.objects.filter(
            lesson=lesson,
            step_type="practice_drag",
            title=PRACTICE_TITLE,
        ):
            config = step.config or {}
            if list(config.get("answer") or []) == list(PRACTICE_CONFIG["answer"]):
                step.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("courses", "0007_move_lesson1_content_to_steps"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
