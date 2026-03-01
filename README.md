# LLM Checker — Setup & Usage Guide

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running on your machine

---

## Getting Started

### Step 1 — Configure Environment Variables

Rename `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then open `.env` and fill in all the required values:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=llm_monitor

JWT_SECRET=your_jwt_secret_here

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

TELEGRAM_BOT_TOKEN=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

> **Note:** The DB variables do not need to be changed if you are running via Docker. Docker Compose sets them internally. Only fill in the secrets like `JWT_SECRET`, SMTP credentials, and any API keys.

---

### Step 2 — Run the Project

From the project root folder, run:

```bash
docker compose up --build
```

This will:
- Build all Docker images (frontend, backend, worker)
- Start PostgreSQL and run all migrations automatically
- Seed the database with provider data
- Start all services

Once running, open your browser and go to:

```
http://localhost:3000
```

---

### Step 3 — Stopping the Project

To stop all running containers, press `Ctrl + C` in the terminal, then run:

```bash
docker compose down
```

To stop and also remove all data volumes (this will wipe the database):

```bash
docker compose down -v
```

---

## Accessing the Docker Database (PostgreSQL)

To open a direct PostgreSQL shell inside the Docker container:

```bash
docker compose exec postgres psql -U <DB_USER> -d <DB_NAME>
```

**For this project specifically:**

```bash
docker compose exec postgres psql -U postgres -d llm_monitor
```

Once inside the psql shell, you can run SQL queries directly. For example:

```sql
SELECT * FROM "user";
SELECT * FROM provider_recent_incident;
```

To exit the psql shell:

```sql
\q
```

---

## Services & Ports

| Service  | URL                   | Description              |
|----------|-----------------------|--------------------------|
| Frontend | http://localhost:3000 | Next.js web app          |
| Backend  | http://localhost:3001 | NestJS REST API          |
| Database | localhost:5432        | PostgreSQL (Docker)      |

---

## Rebuilding After Code Changes

If you make changes to the source code, rebuild with:

```bash
docker compose up --build
```

---


