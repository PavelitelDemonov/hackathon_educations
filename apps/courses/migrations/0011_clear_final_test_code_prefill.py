from django.db import migrations


FINAL_TEST_CODE_TITLE = "Вопрос 3: напиши и запусти код"


def forwards(apps, schema_editor):
    LessonStep = apps.get_model("courses", "LessonStep")
    steps = LessonStep.objects.filter(
        step_type="practice_code",
        title=FINAL_TEST_CODE_TITLE,
    ).order_by("id")

    for step in steps:
        config = dict(step.config or {})
        expected = str(config.get("expected_code") or "").strip()
        starter = str(config.get("starter_code") or "").strip()

        # Убираем готовый ответ из поля редактора.
        if starter and starter == expected:
            config["starter_code"] = ""
            step.config = config
            step.save(update_fields=["config"])


def backwards(apps, schema_editor):
    # Обратную подстановку не делаем, чтобы не возвращать готовый ответ.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("courses", "0010_add_final_test_after_lesson2"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
