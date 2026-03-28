# **Cтарт (Docker)**

```bash
git clone https://github.com/PavelitelDemonov/hackathon_educations
cd hackathon_educations
cp .env.example .env
docker compose up -d --build
```
Открой: http://localhost:8000

## Для импорта тестовых данных в бд:

docker compose exec django python manage.py loaddata users.json courses.json
