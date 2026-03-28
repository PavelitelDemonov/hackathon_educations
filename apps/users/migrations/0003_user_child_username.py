from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_alter_user_email_alter_user_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="child_username",
            field=models.CharField(blank=True, default="", max_length=150),
        ),
    ]
