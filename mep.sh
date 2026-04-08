#!/usr/bin/env bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.prod.yml"

echo "[MEP] Build et redemarrage de la stack production..."
docker compose -f "$COMPOSE_FILE" up --build -d --remove-orphans

echo "[MEP] Etat des conteneurs:"
docker compose -f "$COMPOSE_FILE" ps

echo "[MEP] Dernieres lignes de logs backend:"
docker compose -f "$COMPOSE_FILE" logs --tail=80 backend
