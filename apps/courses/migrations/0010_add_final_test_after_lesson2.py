from django.db import migrations


FINAL_LESSON_TITLE = "Итоговый тест модуля 1"
FINAL_LESSON_CONTENT = "Итоговый тест: теория + практика + код."

FINAL_TEST_STEPS = [
    {
        "step_type": "quiz",
        "title": "Вопрос 1: что такое переменная?",
        "content": "Выбери верное утверждение про переменную.",
        "config": {
            "question": "Что верно про переменную в Python?",
            "options": [
                {"value": "a", "text": "Переменная хранит данные под именем."},
                {"value": "b", "text": "Переменная нужна только для картинок."},
                {"value": "c", "text": "Переменная всегда равна 0."},
            ],
            "correct_answer": "a",
        },
    },
    {
        "step_type": "practice_drag",
        "title": "Вопрос 2: собери запись переменной",
        "content": "Собери выражение `name=\"Аня\"` из кусочков.",
        "config": {
            "tokens": ["=", "name", '"Аня"'],
            "answer": ["name", "=", '"Аня"'],
        },
    },
    {
        "step_type": "practice_code",
        "title": "Вопрос 3: напиши и запусти код",
        "content": (
            "Напиши код, который создаёт переменную `name` со значением `\"Аня\"` "
            "и выводит её через `print()`."
        ),
        "config": {
            "starter_code": "",
            "expected_code": 'name = "Аня"\nprint(name)',
        },
    },
]


def next_lesson_order(Lesson, module):
    max_order = (
        Lesson.objects.filter(module=module)
        .order_by("-order")
        .values_list("order", flat=True)
        .first()
    )
    return int(max_order or 0) + 1


def next_step_order(LessonStep, lesson):
    max_order = (
        LessonStep.objects.filter(lesson=lesson)
        .order_by("-order")
        .values_list("order", flat=True)
        .first()
    )
    return int(max_order or 0) + 1


def ensure_final_steps(LessonStep, lesson):
    existing_steps = list(LessonStep.objects.filter(lesson=lesson).order_by("order", "id"))

    def has_step(step_def):
        for step in existing_steps:
            if step.step_type != step_def["step_type"]:
                continue
            if str(step.title or "").strip() != step_def["title"]:
                continue
            return True
        return False

    for step_def in FINAL_TEST_STEPS:
        if has_step(step_def):
            continue
        new_step = LessonStep.objects.create(
            lesson=lesson,
            order=next_step_order(LessonStep, lesson),
            step_type=step_def["step_type"],
            title=step_def["title"],
            content=step_def["content"],
            config=step_def["config"],
            xp_reward=0,
            is_required=True,
        )
        existing_steps.append(new_step)


def forwards(apps, schema_editor):
    Module = apps.get_model("courses", "Module")
    Lesson = apps.get_model("courses", "Lesson")
    LessonStep = apps.get_model("courses", "LessonStep")

    modules = Module.objects.all().order_by("id")
    for module in modules:
        lessons_qs = Lesson.objects.filter(module=module)
        has_lesson1 = lessons_qs.filter(title__icontains="урок 1").exists()
        has_lesson2 = lessons_qs.filter(title__icontains="урок 2").exists()
        if not (has_lesson1 and has_lesson2):
            continue

        final_lesson = lessons_qs.filter(title__icontains="итоговый тест").order_by("id").first()
        if final_lesson is None:
            final_lesson = Lesson.objects.create(
                module=module,
                title=FINAL_LESSON_TITLE,
                content=FINAL_LESSON_CONTENT,
                order=next_lesson_order(Lesson, module),
                video_url="",
            )
        ensure_final_steps(LessonStep, final_lesson)


def backwards(apps, schema_editor):
    Lesson = apps.get_model("courses", "Lesson")
    LessonStep = apps.get_model("courses", "LessonStep")

    lessons = Lesson.objects.filter(title__icontains="итоговый тест").order_by("id")
    final_titles = {item["title"] for item in FINAL_TEST_STEPS}
    for lesson in lessons:
        steps = LessonStep.objects.filter(lesson=lesson).order_by("order", "id")
        for step in steps:
            if str(step.title or "").strip() in final_titles:
                step.delete()

        remaining_steps = LessonStep.objects.filter(lesson=lesson).exists()
        if str(lesson.title or "").strip() == FINAL_LESSON_TITLE and not remaining_steps:
            lesson.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("courses", "0009_add_lesson2_variable_steps"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
