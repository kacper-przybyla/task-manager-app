# task-manager-app
 
A containerized task management application with a fully automated CI/CD pipeline. This repository contains the application source code, Docker configuration, and CI workflow. Infrastructure and deployment automation live in [task-manager-deployment](https://github.com/kacper-przybyla/task-manager-deployment).
 
**Live demo:** http://18.159.85.126/
 
---
 
## What This Project Demonstrates
 
This is not a showcase of the application itself — it's a showcase of the infrastructure and automation built around it. The app is intentionally simple (FastAPI backend, React frontend, PostgreSQL database). The point is everything else:
 
- A Docker setup with proper network segmentation and health checks — the database is never exposed outside the container network
- A CI pipeline that tests, builds, and triggers deployment on every push to `main` — automatically, in ~2 minutes
- A clean separation between application code (this repo) and infrastructure/deployment (separate repo), connected via GitHub's repository dispatch API
- Semantic versioning of Docker images: SHA-tagged on every push, semver-tagged on releases
- Path filters that prevent the CI pipeline from running on documentation-only changes
---
 
## Tech Stack
 
| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy, PostgreSQL |
| Frontend | React (Vite), Nginx (static serving in production) |
| Proxy | Nginx (reverse proxy, routes `/api` to backend) |
| Containerization | Docker, Docker Compose |
| CI | GitHub Actions |
| Registry | GitHub Container Registry (GHCR) |
| Deployment | Triggered via `repository_dispatch` → [task-manager-deployment](https://github.com/kacper-przybyla/task-manager-deployment) |
 
---
 
## Architecture
 
Three containers communicate over two isolated Docker networks. The proxy is the only public-facing entry point on port 80.
 
```
Internet
    │
    ▼ :80
┌─────────────────────────────────────────────────────────┐
│  proxy (task-proxy)                                     │
│  nginx — serves static files, proxies /api/* → backend  │
└────────────────────┬─────────────────────────────────────┘
                     │ frontend-network
         ┌───────────┴───────────┐
         ▼                       ▼
┌────────────────┐   ┌──────────────────────┐
│  frontend      │   │  backend             │
│  (task-        │   │  (task-backend)       │
│  frontend)     │   │  FastAPI :8000        │
│  nginx, static │   └──────────┬───────────┘
│  React build   │              │ backend-network
└────────────────┘              ▼
                     ┌──────────────────────┐
                     │  database (task-db)  │
                     │  PostgreSQL 14       │
                     │  (not port-exposed)  │
                     └──────────────────────┘
```
 
`frontend-network` connects proxy ↔ frontend ↔ backend. `backend-network` connects backend ↔ database. The database has no route to the outside world.
 
Services use Docker health checks (`pg_isready` on database, `curl /health` on backend) with `depends_on: condition: service_healthy` to enforce correct startup order.
 
### Full Pipeline Flow
 
```
git push to main (paths: backend/**, frontend/**, proxy/**, .github/workflows/ci.yml)
        │
        ▼
┌───────────────────────┐
│  CI: test             │  13 tests, mocked DB (MagicMock)
└──────────┬────────────┘
           │ success
           ▼
┌───────────────────────┐
│  CI: build-and-push   │  Builds 3 images
│                       │  Tags: :latest + :<7-char SHA>
│                       │  Smoke test against real PostgreSQL
│                       │  Pushes to GHCR (skipped on PRs)
└──────────┬────────────┘
           │ success
           ▼
┌───────────────────────┐
│  CI: trigger-deploy   │  repository_dispatch → task-manager-deployment
│                       │  Payload: sha = <7-char git SHA>
└───────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│  CD (task-manager-deployment)                            │
│  OIDC auth → Terraform apply → Ansible deploy            │
│  → EC2 t3.micro, eu-central-1                            │
└──────────────────────────────────────────────────────────┘
           │
           ▼
    http://18.159.85.126/   (~4-5 minutes total)
 
─────────────────────────────────────────────────────────────
On git tag push (v*): same flow, images get 3 tags:
  :latest + :<7-char SHA> + :<semver>  (e.g. 1.3.1)
```
 
---

### Screenshots

**CI pipeline — all jobs green**
![CI Pipeline](docs/ci-pipeline.png)

**build-and-push job — smoke test steps**
![CI Build Detail](docs/ci-build-detail.png)

**Live application**
![Live App](docs/live-app.png)

**GHCR packages — versioned image tags**
![GHCR Packages](docs/ghcr-packages.png)

---

## Architectural Decisions

**Two Docker networks instead of one** (`docker-compose.yml`)

The compose file defines `backend-network` (database + backend) and `frontend-network` (backend + frontend + proxy). The database is on `backend-network` only — it has no route to the proxy or the outside world. The backend sits on both networks and is the only path to the database. A single flat network would let the proxy container reach Postgres directly, which is unnecessary exposure. Network segmentation enforces the principle of least privilege at the infrastructure level without any application-layer changes.

**Health checks with `depends_on: condition: service_healthy`** (`docker-compose.yml`)

The database runs `pg_isready -U postgres` on a 10-second interval with a 20-second start period; the backend polls `curl -f http://localhost:8000/health`. The backend's `depends_on` uses `condition: service_healthy`, so Docker won't start the backend until Postgres is actually accepting connections — not just until the container has started. Without this, there's a race condition on every `docker compose up`: the backend process starts, tries to connect to Postgres before it's listening, and crashes. The plain `depends_on` (without a condition) only waits for the container to exist, not for the service inside it to be ready.

**Non-root user in the backend container** (`backend/Dockerfile`)

A dedicated system user (`appuser`, UID 1001) is created and owns `/app`. The final `USER appuser` directive means uvicorn runs as a non-privileged user. If the application process is ever compromised through a dependency vulnerability or deserialization bug, the attacker gets a restricted account with no write access outside `/app` — not root inside the container. The default behavior if you don't add this is that the process runs as root, which means full container access and potential for privilege escalation through container escape vulnerabilities.

**Three compose files instead of one** (`docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.prod.yml`)

The base file defines the service graph, networks, volumes, health checks, and startup ordering — things that are identical in every environment. The dev override adds bind mounts (`./backend/app:/app/app:ro`) for hot reload, exposes ports directly (5432, 8000, 3000) for local tooling, and passes `--reload` to uvicorn. The prod override pulls pre-built GHCR images, adds CPU/memory resource limits, sets `restart: unless-stopped`, and configures JSON log rotation. Merging all of this into one file with environment-variable conditionals is possible but creates a file that's hard to read and easy to break — you can't tell at a glance what the dev or prod environment actually looks like. The layered approach keeps each file readable on its own.

**Two-stage frontend Dockerfile** (`frontend/Dockerfile`)

Stage 1 uses `node:18` to run `npm ci` and `npm run build`. Stage 2 starts fresh from `nginx:alpine` and copies only the compiled `/app/dist` output. The production image contains no Node.js runtime, no npm, no `node_modules`, and no source files. This isn't just about image size — it reduces the attack surface significantly. A single-stage build would ship the entire Node.js toolchain and all build dependencies into production.

**Path filters in the CI trigger** (`.github/workflows/ci.yml`, lines 6–10)

The `push` trigger on `main` fires only when files under `backend/**`, `frontend/**`, `proxy/**`, or `.github/workflows/ci.yml` change. A README edit, a SQL migration script, or a change to this file does not run the CI pipeline. Without path filters, every documentation commit triggers a full test run, three Docker image builds, a smoke test with a Postgres container, three GHCR pushes, and a deployment. That's wasted compute and registry churn on changes that have no effect on the built artifacts.

**Concurrency cancellation on the same ref** (`.github/workflows/ci.yml`, lines 17–19)

The `concurrency` block groups runs by `${{ github.workflow }}-${{ github.ref }}` and sets `cancel-in-progress: true`. If you push two commits to `main` in quick succession, the CI run for the first commit is cancelled as soon as the second starts. This prevents deploying a stale build — without it, both runs would complete and the earlier one (which deploys an older version) might finish last and overwrite the newer deployment.

---
 
## CI Pipeline
 
**File:** `.github/workflows/ci.yml`
**Runtime:** ~2 minutes
 
### Triggers
 
| Event | Condition |
|---|---|
| `push` to `main` | Only when `backend/**`, `frontend/**`, `proxy/**`, or `.github/workflows/ci.yml` change |
| `push` tag `v*` | Always (no path filter) |
| `pull_request` to `main` | Always (no path filter) |
| `workflow_dispatch` | Manual trigger, no inputs |
 
Concurrency is configured to cancel in-progress runs on the same ref — a new push supersedes an older one still running.
 
### Jobs
 
**1. test** — runs in `./backend`
- Installs `requirements.txt` and `requirements-test.txt`
- Runs `pytest -v` — 13 tests using a `MagicMock` database (no live PostgreSQL needed in this job)
- Must pass before any image is built
**2. build-and-push** — needs: `test`
- **Version detection:** if triggered by a `v*` tag → `app_version` = semver without the `v` prefix (e.g. `1.3.1`); otherwise → `app_version` = first 7 chars of git SHA
- Builds three images: `task-manager-backend`, `task-manager-frontend`, `task-manager-proxy`
- **Tagging on branch push:** `:latest` + `:<7-char SHA>` (2 tags per image)
- **Tagging on tag push:** `:latest` + `:<7-char SHA>` + `:<semver>` (3 tags per image)
- **Smoke test:** spins up `postgres:14-alpine`, waits for readiness, starts the backend image against it, polls `GET /health` up to 10 times — verifies the built image actually runs before pushing
- **Push:** skipped on `pull_request` events; runs on everything else
**3. trigger-deploy** — needs: `build-and-push`, only on `push` events
- Sends `repository_dispatch` with `event_type: deploy` to `task-manager-deployment`
- Passes `sha: <app_version>` in `client_payload` so the CD pipeline deploys the exact version just built
**4. notify** — needs: all jobs, only on `failure()`
- Prints repository, event name, SHA, and commit message for debugging
### Why Mocked Tests in CI, Smoke Test After Build?
 
The unit tests use a `MagicMock` database — they run fast and test API contracts and validation logic. The real integration check happens in the smoke test step: an actual Docker container is started against a real PostgreSQL instance and the `/health` endpoint is polled. This verifies the Docker image works end-to-end, not just the Python code in isolation.
 
---
 
## Docker Architecture
 
### Network Segmentation
 
The `docker-compose.yml` defines two bridge networks:
 
- `backend-network`: database + backend only
- `frontend-network`: backend + frontend + proxy
The database is on `backend-network` exclusively — it has no path to the proxy or the internet. The backend sits on both networks, acting as the boundary between layers.
 
### Dockerfiles
 
**Backend** (`backend/Dockerfile`) — single stage, `python:3.11-slim`
- Creates a non-root user (`appuser`, UID 1001) and runs the application as that user
- Installs `postgresql-client` and `curl` for health checks and diagnostics
- Runs `uvicorn app.main:app --host 0.0.0.0 --port 8000`
**Frontend** (`frontend/Dockerfile`) — two stages
- Stage 1 (`builder`): `node:18` — runs `npm ci` then `npm run build`
- Stage 2: `nginx:alpine` — copies only the compiled `/app/dist` output; no Node.js in production
**Proxy** (`proxy/Dockerfile`) — single stage, `nginx:alpine`
- Copies `nginx.conf` only; handles routing between frontend static files and backend API
### Docker Compose Files
 
Three compose files designed for layered overrides:
 
- `docker-compose.yml` — base: services, networks, volumes, health checks, `depends_on` ordering
- `docker-compose.dev.yml` — adds bind mounts (live reload), exposes ports for local access, `--reload` flag on uvicorn
- `docker-compose.prod.yml` — pulls images from GHCR, adds CPU/memory resource limits, `restart: unless-stopped`, JSON log rotation
---

## Known Limitations

**Images pinned to `:latest` in the prod compose file** (`docker-compose.prod.yml`)

All three service images are referenced as `:latest`. The file even has TODO comments acknowledging this: `# TODO: Pin to specific SHA when CD pipeline is implemented`. The `:latest` tag is mutable — a `docker pull` on the same host can fetch a different image than the one that was tested, depending on what's been pushed since. In a real production setup the CD pipeline would pass the specific SHA tag (e.g., `ghcr.io/.../task-manager-backend:abc1234`) built and smoke-tested by CI, so the deployed version is always traceable to a specific commit.

**No HTTPS/TLS** (`proxy/nginx.conf`)

The proxy listens on port 80 only. All traffic between the user's browser and the server is unencrypted. In production this needs TLS termination at the proxy layer — either Let's Encrypt with certbot (adding port 443 binding, certificate renewal, and HTTP-to-HTTPS redirect) or offloading it to a cloud load balancer or CDN in front of the instance. Without it, session tokens, task data, and form submissions travel in plaintext.

**No centralized logging** (`docker-compose.prod.yml`)

All containers use the `json-file` log driver with `max-size: 10m, max-file: 3`. Logs are capped at 30 MB per service on the EC2 instance's local disk and are gone when the container is removed or the instance is replaced. There's no way to correlate logs across services, search historical events, or set up alerts. In production you'd ship logs to a centralized system — CloudWatch Logs, Loki, or a managed ELK stack — so logs survive instance replacement and are queryable across the full deployment history.

**Single EC2 instance with no redundancy**

All four containers — proxy, frontend, backend, and database — run on a single `t3.micro` in `eu-central-1`. If the instance goes down, the application is completely unavailable. There's no load balancer, no multi-AZ setup, and no failover. The database is a container on the same host, so a hardware failure takes both the application and the data. In production the database would move to a managed service (RDS with Multi-AZ), the application containers to a managed orchestrator (ECS or EKS) running across at least two availability zones, and traffic would go through an Application Load Balancer.

---
 
## Local Development
 
### Prerequisites
 
- Docker and Docker Compose installed
- Git
### Running Locally
 
```bash
git clone https://github.com/kacper-przybyla/task-manager-app.git
cd task-manager-app
```
 
Create a `.env` file in the project root:
 
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=yourpassword
POSTGRES_DB=taskdb
DATABASE_URL=postgresql+psycopg2://postgres:yourpassword@database:5432/taskdb
ENVIRONMENT=development
```
 
Start all services with the dev override:
 
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```
 
The application is available at `http://localhost`. The backend hot-reloads on code changes via the bind-mounted source directory.
 
### Running Tests
 
```bash
cd backend
pip install -r requirements.txt -r requirements-test.txt
pytest -v
```
 
Tests use a mocked database — no running PostgreSQL instance required.
 
---
 
## Repository Structure
 
```
task-manager-app/
├── backend/
│   ├── app/                  FastAPI application code
│   ├── tests/
│   │   └── test_api.py       13 API tests (mocked DB)
│   ├── Dockerfile            Single-stage, non-root user
│   ├── requirements.txt
│   └── requirements-test.txt
├── database/
│   ├── init/                 SQL scripts run on first container start
│   └── migrations/           Schema migration scripts
├── frontend/
│   ├── src/                  React application (Vite)
│   ├── nginx.conf            Frontend container nginx config
│   └── Dockerfile            Two-stage: Node builder → nginx:alpine
├── proxy/
│   ├── nginx.conf            Reverse proxy routing
│   └── Dockerfile            Single-stage nginx:alpine
├── docker-compose.yml        Base: services, networks, health checks
├── docker-compose.dev.yml    Override: bind mounts, port exposure, hot reload
├── docker-compose.prod.yml   Override: GHCR images, resource limits, restart policy
└── .github/
    └── workflows/
        └── ci.yml            CI pipeline (test → build → smoke test → push → trigger CD)
```
 
---

## Related Repository

Infrastructure provisioning (Terraform), deployment automation (Ansible), CD pipeline, and Python CLI tool:
**[task-manager-deployment](https://github.com/kacper-przybyla/task-manager-deployment)**
