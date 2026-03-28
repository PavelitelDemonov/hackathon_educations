from django.db import migrations


SUMMARY_TEXT = "Структура урока перенесена в шаги LessonStep."

LESSON2_THEORY_STEPS = [
    {
        "title": "Что такое переменная",
        "content": (
            "Переменная в программировании — это именованная ячейка памяти.\n\n"
            "В неё можно положить значение, чтобы потом использовать его в коде."
        ),
    },
    {
        "title": "Простая аналогия",
        "content": (
            "Представь коробку с наклейкой.\n\n"
            "Наклейка — это имя переменной, а то, что внутри коробки — значение."
        ),
    },
    {
        "title": "Как создать переменную в Python",
        "content": (
            "В Python переменная создаётся через знак `=`.\n\n"
            "Пример:\n\n"
            "```python\n"
            "name = \"Аня\"\n"
            "age = 10\n"
            "```"
        ),
    },
    {
        "title": "Какие бывают значения",
        "content": (
            "В переменных можно хранить:\n"
            "- текст;\n"
            "- числа;\n"
            "- `True/False`.\n\n"
            "Это основа почти любой программы."
        ),
    },
    {
        "title": "Зачем нужны переменные",
        "content": (
            "Переменные помогают программе запоминать данные:\n"
            "- имя игрока;\n"
            "- очки;\n"
            "- количество жизней;\n"
            "- текущий уровень."
        ),
    },
    {
        "title": "Показываем значение через print()",
        "content": (
            "Чтобы вывести значение переменной на экран, используй `print()`.\n\n"
            "```python\n"
            "name = \"Аня\"\n"
            "print(name)\n"
            "```"
        ),
    },
]

PRACTICE_TITLE = "Практика: собери переменную"
PRACTICE_CONTENT = "Собери правильную запись переменной с именем `name` и значением `\"Аня\"`."
PRACTICE_CONFIG = {
    "tokens": ['"Аня"', "name="],
    "answer": ["name=", '"Аня"'],
}


def get_next_order(LessonStep, lesson):
    max_order = (
        LessonStep.objects.filter(lesson=lesson)
        .order_by("-order")
        .values_list("order", flat=True)
        .first()
    )
    return int(max_order or 0) + 1


def has_target_practice_step(step):
    config = step.config or {}
    return (
        step.step_type == "practice_drag"
        and str(step.title or "").strip() == PRACTICE_TITLE
        and list(config.get("answer") or []) == list(PRACTICE_CONFIG["answer"])
    )


def forwards(apps, schema_editor):
    Lesson = apps.get_model("courses", "Lesson")
    LessonStep = apps.get_model("courses", "LessonStep")

    lessons = Lesson.objects.filter(title__icontains="урок 2").order_by("id")
    for lesson in lessons:
        lesson_steps = list(LessonStep.objects.filter(lesson=lesson).order_by("order", "id"))

        if not lesson_steps:
            for index, item in enumerate(LESSON2_THEORY_STEPS, start=1):
                LessonStep.objects.create(
                    lesson=lesson,
                    order=index,
                    step_type="theory",
                    title=item["title"],
                    content=item["content"],
                    config={},
                    xp_reward=0,
                    is_required=True,
                )
            lesson.content = SUMMARY_TEXT
            lesson.save(update_fields=["content"])
            lesson_steps = list(LessonStep.objects.filter(lesson=lesson).order_by("order", "id"))

        has_practice = any(has_target_practice_step(step) for step in lesson_steps)
        if not has_practice:
            LessonStep.objects.create(
                lesson=lesson,
                order=get_next_order(LessonStep, lesson),
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

    lessons = Lesson.objects.filter(title__icontains="урок 2").order_by("id")
    lesson2_titles = {item["title"] for item in LESSON2_THEORY_STEPS}

    for lesson in lessons:
        for step in LessonStep.objects.filter(lesson=lesson).order_by("order", "id"):
            if has_target_practice_step(step):
                step.delete()
                continue
            if (
                step.step_type == "theory"
                and str(step.title or "").strip() in lesson2_titles
            ):
                step.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("courses", "0008_add_lesson1_practice_drag_step"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
