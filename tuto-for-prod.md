# Guide de déploiement — Production Docker

> Stack : NestJS + React (Vite) + PostgreSQL + Nginx  
> Domaine : `thegoodplace-wow.xyz` via tunnel Cloudflare

---

## Prérequis sur le serveur

- Docker >= 24 et Docker Compose v2 installés
- Git installé
- Accès SSH au serveur
- Tunnel Cloudflare configuré et pointant sur `localhost:8080`

---

## Étape 1 — Cloner le projet

```bash
git clone <url-du-repo> guild-hub
cd guild-hub
```

---

## Étape 2 — Créer le fichier `.env.prod` du backend

```bash
cp backend/.env.sample backend/.env.prod
```

Ouvre le fichier et remplis **toutes** les valeurs :

```env
# Base de données (doit correspondre aux variables du service "db" dans docker-compose.prod.yml)
DATABASE_URL="postgresql://POSTGRES_USER:POSTGRES_PASSWORD@db:5432/POSTGRES_DB"
# Remplace POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB par les vraies valeurs
# Exemple : postgresql://guild:s3cr3t@db:5432/guildhub

# URL du frontend (utilisée par le backend pour les redirections OAuth)
FRONTEND_URL=https://thegoodplace-wow.xyz

# Battle.net OAuth — Récupère ces infos sur https://develop.battle.net
BNET_CLIENT_ID=ton_client_id
BNET_CLIENT_SECRET=ton_client_secret
BNET_REGION=eu
BNET_CALLBACK_URL=https://thegoodplace-wow.xyz/api/auth/bnet/callback

# JWT — Génère un secret long et aléatoire
# Commande pour en générer un : openssl rand -base64 64
JWT_SECRET=une_phrase_tres_longue_et_aleatoire
JWT_EXPIRATION=7d

# Discord Webhook (optionnel)
DISCORD_WEBHOOK_URL=""
```

> **Important** : ne commite jamais `.env.prod` dans Git.  
> Vérifie que `.env.prod` est bien dans `.gitignore` :
> ```bash
> echo "backend/.env.prod" >> .gitignore
> ```

---

## Étape 3 — Créer le dossier pour les uploads

Ce dossier sera monté en volume dans le conteneur backend pour persister les images.

```bash
mkdir -p uploads
```

---

## Étape 4 — Vérifier la variable `VITE_API_URL` dans docker-compose.prod.yml

Ouvre [docker-compose.prod.yml](docker-compose.prod.yml) et vérifie la ligne suivante dans le service `frontend` :

```yaml
args:
    VITE_API_URL: https://thegoodplace-wow.xyz/api
```

Cette valeur est **baked** dans le bundle au moment du build. Si ton domaine change, modifie-la ici et rebuilde.

---

## Étape 5 — Définir les variables PostgreSQL

Ces variables sont lues par le service `db` dans `docker-compose.prod.yml`.  
La façon la plus propre est de les exporter dans le shell avant de lancer la commande :

```bash
export POSTGRES_USER=guild
export POSTGRES_PASSWORD=ton_mot_de_passe_db
export POSTGRES_DB=guildhub
```

Ou crée un fichier `.env` à la racine du projet (Docker Compose le charge automatiquement) :

```bash
cat > .env << 'EOF'
POSTGRES_USER=guild
POSTGRES_PASSWORD=ton_mot_de_passe_db
POSTGRES_DB=guildhub
EOF
```

> Assure-toi que ces valeurs correspondent exactement à celles dans `DATABASE_URL` de `.env.prod`.

---

## Étape 6 — Builder et lancer les conteneurs

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

- `--build` : force le rebuild de toutes les images (nécessaire au premier lancement et après chaque modification du code)
- `-d` : mode détaché (tourne en arrière-plan)

### Suivre les logs au démarrage

```bash
# Tous les services
docker compose -f docker-compose.prod.yml logs -f

# Backend uniquement (pour voir les migrations Prisma)
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## Étape 7 — Vérifier que tout tourne

```bash
docker compose -f docker-compose.prod.yml ps
```

Tu dois voir les 3 services avec le statut `running` :

```
NAME                        STATUS
guild-hub-db-prod           running (healthy)
guild-hub-backend-prod      running
guild-hub-frontend-prod     running
```

### Tester le backend

```bash
curl http://localhost:3000/api/docs
# Doit retourner le HTML de Swagger
```

### Tester le frontend

```bash
curl -I http://localhost:8080
# Doit retourner HTTP/1.1 200 OK
```

---

## Étape 8 — Vérifier le tunnel Cloudflare

Le tunnel doit pointer sur `http://localhost:8080` (le port exposé par le service `frontend`).

Dans le dashboard Cloudflare Zero Trust :
- **Service** : `http://localhost:8080`
- **Domaine public** : `thegoodplace-wow.xyz`

---

## Commandes utiles au quotidien

### Redéployer après une mise à jour du code

```bash
git pull
docker compose -f docker-compose.prod.yml up --build -d
```

### Arrêter les conteneurs

```bash
docker compose -f docker-compose.prod.yml down
```

### Arrêter ET supprimer les volumes (reset complet de la DB)

```bash
# ATTENTION : supprime toutes les données PostgreSQL
docker compose -f docker-compose.prod.yml down -v
```

### Accéder au shell d'un conteneur

```bash
# Backend
docker exec -it guild-hub-backend-prod sh

# Base de données (psql)
docker exec -it guild-hub-db-prod psql -U guild -d guildhub
```

### Voir les logs d'un service

```bash
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f db
```

### Lancer manuellement une migration Prisma

```bash
docker exec -it guild-hub-backend-prod npx prisma migrate deploy
```

---

## Structure des fichiers de déploiement

```
guild-hub/
├── docker-compose.prod.yml     ← Orchestrateur de production
├── .env                        ← Variables PostgreSQL (POSTGRES_USER, etc.)
├── uploads/                    ← Fichiers uploadés (persistés hors conteneur)
├── backend/
│   ├── Dockerfile.prod         ← Multi-stage NestJS
│   └── .env.prod               ← Variables secrètes du backend (ne pas commiter)
└── frontend/
    ├── Dockerfile.prod         ← Multi-stage Vite + Nginx
    └── nginx.conf              ← Config SPA fallback
```

---

## Résolution de problèmes fréquents

### Le backend crash au démarrage avec une erreur de connexion DB

Le healthcheck sur `db` devrait l'éviter, mais si ça arrive :
```bash
# Vérifier que la DB est healthy
docker compose -f docker-compose.prod.yml ps db
# Redémarrer uniquement le backend
docker compose -f docker-compose.prod.yml restart backend
```

### Erreur `prisma migrate deploy` — migration déjà appliquée

C'est normal. Prisma ignore les migrations déjà jouées, pas de danger.

### Le frontend affiche une page blanche

Vérifier la console du navigateur. Si `VITE_API_URL` pointe au mauvais endroit :
1. Modifier `VITE_API_URL` dans `docker-compose.prod.yml`
2. Rebuilder : `docker compose -f docker-compose.prod.yml up --build -d frontend`

### Prisma génère une erreur `openssl`

L'image `runner` dans `backend/Dockerfile.prod` installe déjà `openssl` via `apk`. Si l'erreur persiste, vérifier que le stage `runner` contient bien :
```dockerfile
RUN apk add --no-cache openssl
```
