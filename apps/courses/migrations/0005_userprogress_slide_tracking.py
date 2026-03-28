from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0004_userprogress_module_reward_granted"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprogress",
            name="slides_completed",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="userprogress",
            name="viewed_slide_indexes",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
