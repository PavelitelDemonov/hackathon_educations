# **Cтарт (Docker)**

```bash
git clone https://github.com/PavelitelDemonov/hackathon_educations
cd hackathon_educations
cp .env.example .env
docker compose up -d --build
```
Открой: http://localhost:8000


# Warning!!!

Все настройки выставлены в DEBUG режиме!
**Не забудьте изменить их перед выкладкой в продакшн!**
## **НАСТРОЙКИ ДЛЯ PROD**
**.env :**
DEBUG=0 (сейчас DEBUG=1)
SECRET_KEY = <длинный случайный ключ> (не dev-secret)
ALLOWEDHOSTS = your-domain.com,www.your-domain.com
POSTGRES/DB_ (не user/pass123)

**Django security в config/settings.py**

CSRF_COOKIE_SECURE = True       (сейчас False)
SESSION_COOKIE_SECURE = True    (сейчас False)
SECURE_SSL_REDIRECT = True      (сейчас False)
SECURE_HSTS_SECONDS = 31536000  (365 дней) - раскомментировать
SECURE_HSTS_INCLUDE_SUBDOMAINS = True (сейчас False)
SECURE_HSTS_PRELOAD = True             (сейчас False)
#CSRF_TRUSTED_ORIGINS = ["https://your-domain.com/"] - раскомментировать, вставить свой домен
CORS_ALLOWED_ORIGINS   -    заменить с localhost на ваш frontend-домен.

**docker-compose.yml**
Заменить runserver на gunicorn

**Перед стартом делать collectstatic**

**config/local.py**
DEBUG=True и ALLOWED_HOSTS=["*"] не использовать.

**docker-compose.yml**
  ports: - "5433:5432"  -убрать
## Для импорта тестовых данных в бд:

docker compose exec django python manage.py loaddata users.json courses.json