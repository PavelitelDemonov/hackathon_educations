from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0003_module_language"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprogress",
            name="module_reward_granted",
            field=models.BooleanField(default=False),
        ),
    ]

