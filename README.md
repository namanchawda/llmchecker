# LLM Checker: LLM Status, Performance & Quota Monitoring Platform

A unified platform to monitor the **availability, performance, and usage limits** of Large Language Models (LLMs) across multiple providers such as OpenAI, Anthropic, Google Gemini, and Grok.

If you depend on LLM APIs, you need to know three things: is the provider up, is it fast right now, and how much quota do I have left? LLM Checker answers all three in one place, with a public dashboard for everyone and a private dashboard for logged-in users.

---

## Features

### 1. Status Monitoring
- Fetches data from official provider status pages.
- Shows current operational status and active incidents, with severity and timestamps where available.
- Normalizes data across providers so they can be compared side by side.
- Stores history for trend analysis.

### 2. Live Performance Monitoring
- Runs scheduled test prompts against each supported LLM (default interval: every 5 minutes, configurable).
- Records response time (latency), success or failure, and error types such as timeouts, rate limits, and API errors.
- Users can define custom prompts per LLM and enable or disable monitoring per prompt.
- Public dashboard shows aggregated, non-user-specific metrics.

### 3. Quota / Rate Limit Monitoring
- Logged-in users can securely add their own provider API keys (stored encrypted).
- Periodically checks usage, limits, and remaining balance.
- Flags near-limit usage, low balance, and hard limit exhaustion.
- Quota data is visible only to the owning user.

### 4. Alerts
- Automated alerts for failures and disruptions via email, Telegram, and Slack.
- Telegram alerts are optional (see `TELEGRAM_BOT_TOKEN` below).

### 5. Dashboards & API Access
- **Public dashboard** (no login): provider availability, active incidents, aggregated latency and failure metrics.
- **User dashboard**: personal quota status, custom prompt performance, historical trends and alerts.
- **Platform API keys**: logged-in users can generate and revoke API keys to access status data, historical metrics, and their own quota data programmatically.

---

## User Roles

| Role | Access |
|------|--------|
| Anonymous | View public status and live monitoring dashboards |
| Registered user | Manage provider API keys, custom prompts, platform API keys, and private dashboards |
| Admin | Manage supported providers, global prompts, monitoring rules, and status page parsers |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, TypeScript |
| Backend | NestJS (Node.js), TypeScript, REST APIs |
| Database | PostgreSQL, TypeORM |
| Background jobs | Separate worker service for scheduled checks and alerts |
| Auth | Google OAuth, JWT |
| Infrastructure | Docker, Docker Compose |

---

## Architecture

The app runs as four Docker services:

| Service | Role |
|---------|------|
| Frontend | Next.js web app and dashboards |
| Backend | NestJS REST API, auth, and data access |
| Worker | Runs scheduled status checks, live prompts, quota checks, and alerts |
| PostgreSQL | Stores status snapshots, monitoring results, quota metrics, and history |

---

# Setup & Usage Guide

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running on your machine

---

## Getting Started

### Step 1: Configure Environment Variables

Rename `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then open `.env` and fill in all the required values:

```dotenv
OPENAI_API_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

JWT_SECRET=

SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

ENCRYPTION_KEY=

DB_HOST=
DB_PORT=
DB_USER=
DB_PASS=
DB_NAME=

# ── Telegram alerts (optional) ─────────────────────────────────
TELEGRAM_BOT_TOKEN=

```

> **Note:** The DB variables do not need to be changed if you are running via Docker. Docker Compose sets them internally. Only fill in the secrets like `JWT_SECRET`, SMTP credentials, and any API keys.

---

### Step 2: Run the Project

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

### Step 3: Stopping the Project

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

## Security Notes

- User-provided provider API keys are stored in encrypted form (using `ENCRYPTION_KEY`).
- Never commit your `.env` file. Only `.env.example` should be in version control.
- Quota data is private to the owning user.
