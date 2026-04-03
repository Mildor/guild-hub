.PHONY: up down restart logs ps build clean install shell-backend shell-frontend shell-db

# Variables
COMPOSE = docker compose -p guild-hub-dev -f compose.dev.yml

# Default command
all: up

# Start the environment
up:
	$(COMPOSE) up -d

# Stop the environment
down:
	$(COMPOSE) down

# Restart the environment
restart:
	$(COMPOSE) restart

# Show logs
logs:
	$(COMPOSE) logs -f

# Show running containers
ps:
	$(COMPOSE) ps

# Build or rebuild services
build:
	$(COMPOSE) build

# Stop and remove volumes
clean:
	$(COMPOSE) down -v

# Install dependencies locally in both backend and frontend
install:
	cd backend && pnpm install
	cd frontend && pnpm install

# Shell access to containers
shell-backend:
	$(COMPOSE) exec backend sh

shell-frontend:
	$(COMPOSE) exec frontend sh

shell-db:
	$(COMPOSE) exec db psql -U postgres -d guild-hub
