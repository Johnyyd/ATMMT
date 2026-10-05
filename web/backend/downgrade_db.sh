# Lùi lại 1 migration (về revision 4df893a8b294 tương ứng của main)
docker compose exec backend alembic downgrade -1

git switch main
docker compose up --build -d
