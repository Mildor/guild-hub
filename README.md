# Guild Hub

Plateforme de gestion de guilde World of Warcraft — gestion de roster, événements de raid, présences et stratégies de boss.

**Stack :** NestJS · React 19 · PostgreSQL · Prisma · Redis · Docker · Nginx  
**Domaine de production :** `thegoodplace-wow.xyz`

---

## Fonctionnalités

- **Authentification Battle.net** via OAuth 2.0 (Passport.js + JWT)
- **Vérification de guilde** — promotion automatique GUEST → MEMBER via l'API Blizzard
- **Roster** — synchronisation des personnages depuis l'API Blizzard (ilvl, spécialisation, rôle, avatar)
- **Calendrier d'événements** — création par les officers, RSVP (Accepté / Refusé / Tentative / En retard)
- **Stratégies de boss** — notes par rôle (Tank/Heal/DPS), images de positionnement, recherche full-text
- **Panneau admin** — gestion des rôles utilisateurs (GUEST → MEMBER → OFFICER → ADMIN)
- **Notifications Discord** — annonce automatique des événements via webhook
- **Documentation API** — Swagger disponible sur `/api/docs`

---

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) >= 24 et Docker Compose v2
- [pnpm](https://pnpm.io/) (développement local uniquement)
- Credentials Battle.net OAuth ([develop.battle.net](https://develop.battle.net))

---

## Développement local

### 1. Cloner le projet

```bash
git clone <url-du-repo> guild-hub
cd guild-hub
```

### 2. Variables d'environnement

**Backend** — copier et remplir :

```bash
cp backend/.env.sample backend/.env
```

```env
DATABASE_URL="postgresql://guild:password@db:5432/guildhub"
FRONTEND_URL=http://localhost:8073

BNET_CLIENT_ID=ton_client_id
BNET_CLIENT_SECRET=ton_client_secret
BNET_REGION=eu
BNET_CALLBACK_URL=http://localhost:3000/auth/bnet/callback

JWT_SECRET=une_phrase_tres_longue_et_aleatoire
JWT_EXPIRATION=7d

DISCORD_WEBHOOK_URL=""
```

**Frontend** — copier et remplir :

```bash
cp frontend/.env.sample frontend/.env
```

```env
VITE_API_URL=http://localhost:3000
```

**PostgreSQL** — à la racine :

```bash
cp .env.sample .env   # ou créer manuellement
```

```env
POSTGRES_USER=guild
POSTGRES_PASSWORD=password
POSTGRES_DB=guildhub
```

### 3. Installer les dépendances

```bash
make install
```

### 4. Démarrer l'environnement

```bash
make up
```

Le `Makefile` force le projet Docker Compose dev sur `guild-hub-dev`, ce qui permet de lancer le stack de dev en parallele du stack de prod sans collision de services Compose.

| Service   | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:8073        |
| Backend   | http://localhost:3000        |
| Swagger   | http://localhost:3000/api/docs |
| Adminer   | http://localhost:5051        |

### Commandes Makefile

```bash
make up            # Démarrer tous les conteneurs
make down          # Arrêter les conteneurs
make logs          # Suivre les logs
make ps            # Statut des conteneurs
make install       # pnpm install (frontend + backend)
make shell-backend # Shell dans le conteneur backend
make shell-db      # psql dans la base de données
```

---

## Déploiement en production

> Voir [tuto-for-prod.md](tuto-for-prod.md) pour le guide complet pas à pas.

### Résumé rapide

```bash
# 1. Configurer les variables d'environnement
cp backend/.env.sample backend/.env.prod
# Remplir toutes les valeurs dans backend/.env.prod

# 2. Variables PostgreSQL (chargées automatiquement par Compose)
cat > .env << 'EOF'
POSTGRES_USER=guild
POSTGRES_PASSWORD=ton_mot_de_passe
POSTGRES_DB=guildhub
EOF

# 3. Créer le dossier uploads (volume persistant)
mkdir -p uploads

# 4. Builder et lancer
docker compose -f docker-compose.prod.yml up --build -d

# 5. Vérifier
docker compose -f docker-compose.prod.yml ps
```

### Redéployer après une mise à jour

```bash
git pull
docker compose -f docker-compose.prod.yml up --build -d
```

### Lancer dev et prod en parallele

```bash
# Stack dev (projet compose: guild-hub-dev)
make up

# Stack prod (projet compose: guild-hub-prod)
docker compose -p guild-hub-prod -f docker-compose.prod.yml up --build -d
```

---

## Architecture

```
guild-hub/
├── backend/                    # API NestJS
│   ├── src/
│   │   ├── auth/               # OAuth Battle.net + JWT
│   │   ├── characters/         # Gestion des personnages + sync Blizzard
│   │   ├── events/             # Événements de raid
│   │   ├── attendances/        # Présences / RSVP
│   │   ├── strategies/         # Stratégies de boss
│   │   ├── users/              # Gestion des utilisateurs
│   │   ├── blizzard/           # Intégration API Blizzard
│   │   ├── discord/            # Webhook Discord
│   │   └── prisma/             # Wrapper PrismaService
│   ├── prisma/
│   │   ├── schema.prisma       # Modèles de données
│   │   └── migrations/
│   ├── Dockerfile
│   └── Dockerfile.prod
│
├── frontend/                   # SPA React + Vite
│   ├── src/
│   │   ├── pages/              # Composants de pages
│   │   ├── components/         # Composants UI réutilisables
│   │   ├── api/                # Hooks React Query
│   │   ├── store/              # Zustand (authStore)
│   │   ├── types/              # Types TypeScript
│   │   └── lib/                # Axios instance, JWT parser
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── nginx.conf
│
├── compose.dev.yml             # Docker Compose développement
├── docker-compose.prod.yml     # Docker Compose production
├── Makefile                    # Commandes de développement
└── uploads/                    # Images uploadées (volume persistant)
```

### Modèles de données

| Modèle       | Description                                        |
|--------------|----------------------------------------------------|
| `User`       | Compte Battle.net avec rôle applicatif             |
| `Character`  | Personnage WoW (classe, spé, ilvl, avatar)         |
| `Event`      | Événement de raid créé par un officer/admin        |
| `Attendance` | RSVP d'un utilisateur à un événement               |
| `Strategy`   | Stratégie de boss avec notes par rôle et images    |

### Rôles utilisateurs

| Rôle      | Droits                                              |
|-----------|-----------------------------------------------------|
| `GUEST`   | Accès limité — doit vérifier son appartenance       |
| `MEMBER`  | Consultation + RSVP aux événements                  |
| `OFFICER` | + Création d'événements et de stratégies            |
| `ADMIN`   | Accès complet + gestion des rôles utilisateurs      |

---

## Flux d'authentification

```
Utilisateur → /auth/bnet → Blizzard OAuth → /auth/bnet/callback
    → JWT généré → frontend /login/success?token=JWT
    → Token stocké en localStorage → Accès protégé
```

La vérification de guilde (`POST /auth/verify-guild`) appelle l'API Blizzard pour confirmer l'appartenance à la guilde et promouvoir le compte GUEST → MEMBER.

---

## Variables d'environnement — référence

### Backend (`backend/.env` / `backend/.env.prod`)

| Variable             | Description                                 | Exemple                                  |
|----------------------|---------------------------------------------|------------------------------------------|
| `DATABASE_URL`       | URL de connexion PostgreSQL                 | `postgresql://guild:pw@db:5432/guildhub` |
| `FRONTEND_URL`       | URL du frontend (redirections OAuth)        | `https://thegoodplace-wow.xyz`           |
| `BNET_CLIENT_ID`     | Client ID Battle.net OAuth                  | —                                        |
| `BNET_CLIENT_SECRET` | Client Secret Battle.net OAuth              | —                                        |
| `BNET_REGION`        | Région Blizzard                             | `eu`                                     |
| `BNET_CALLBACK_URL`  | URL de callback OAuth                       | `https://…/api/auth/bnet/callback`       |
| `JWT_SECRET`         | Secret de signature JWT                     | `openssl rand -base64 64`                |
| `JWT_EXPIRATION`     | Durée de vie du token                       | `7d`                                     |
| `DISCORD_WEBHOOK_URL`| Webhook Discord (optionnel)                 | —                                        |

### Frontend (`frontend/.env`)

| Variable       | Description          | Exemple                          |
|----------------|----------------------|----------------------------------|
| `VITE_API_URL` | URL de base de l'API | `https://thegoodplace-wow.xyz/api` |

### PostgreSQL (`.env` racine)

| Variable            | Description            |
|---------------------|------------------------|
| `POSTGRES_USER`     | Utilisateur PostgreSQL |
| `POSTGRES_PASSWORD` | Mot de passe           |
| `POSTGRES_DB`       | Nom de la base         |
