# **Hackathon Education**

## **Быстрый старт (Docker)**

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
Открой: http://localhost:8000/admin
```
## local:
```
# 1. Создай виртуальное окружение
python -m venv .venv

# 2. Активируй окружение
# Linux/Mac:
source .venv/bin/activate
# Windows (cmd):
.venv/Scripts/activate
# Windows (PowerShell):
.venv/Scripts/Activate.ps1

# 3. Установи зависимости
pip install -r requirements.txt

# 4. Настрой окружение
cp .env.example .env

# 5. Укажи настройки для разработки
# Linux/Mac:
export DJANGO_SETTINGS_MODULE=config.settings.local
# Windows (PowerShell):
$env:DJANGO_SETTINGS_MODULE = "config.local"
# Windows (cmd):
set DJANGO_SETTINGS_MODULE=config.local

# 6. Миграции и запуск
python manage.py migrate
python manage.py runserver
