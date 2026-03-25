# hackathon_educations

cp .env.example .env
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
# Открыть: http://localhost:8000/admin 


# local:

python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# в зависимости от OS выполнить одно из:
# linux: export DJANGO_SETTINGS_MODULE=config.settings.local
# win: $env:DJANGO_SETTINGS_MODULE = "config.settings.local"
python manage.py migrate
python manage.py runserver