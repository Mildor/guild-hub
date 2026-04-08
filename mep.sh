#!/usr/bin/env bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.prod.yml"

echo "[MEP] Récupération des dernières modifications depuis le dépôt git..."
git pull origin main

echo "[MEP] Build et redemarrage de la stack production..."
docker compose -f "$COMPOSE_FILE" up --build -d --remove-orphans

echo "[MEP] Etat des conteneurs:"
docker compose -f "$COMPOSE_FILE" ps

sleep 10

echo "[MEP] Migration de la base de données..."
docker compose -f "$COMPOSE_FILE" exec backend sh -c "pnpm dlx prisma db push"
echo "[MEP] Mise à jour terminée avec succès!"
