# Task Manager Application

A production-ready 3-tier task management system built with React, FastAPI, and PostgreSQL.

## Architecture
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** FastAPI + SQLAlchemy
- **Database:** PostgreSQL 14
- **Proxy:** Nginx reverse proxy

## AI Assistance

Parts of the application layer were developed with assistance from **Claude Code** using prompt-based code generation. This includes:

* React frontend code
* FastAPI backend code (API routes, application logic, and data models)
* Nginx configuration
* PostgreSQL scripts

All **Docker and infrastructure-related work** was implemented manually, including:

* Dockerfiles and multi-stage builds
* Docker Compose architecture (dev and production environments)
* Multi-environment configuration using override files
* Container resource limits and runtime configuration
* Log rotation setup
* Image versioning and tagging strategy
* Docker Hub publishing workflow
* Deployment workflow using pre-built images

The goal of this project was to practice **DevOps and containerization concepts**, while also demonstrating the ability to effectively use modern AI-assisted development tools as part of the development workflow.


## Quick Start
```bash
docker compose up -d --build
```
Visit: http://localhost

## Version history
- v1.0.0 - Base CRUD operations
- v1.1.0 - Add task priorities
- v1.2.0 - Add task categories feature
- v1.2.1 - Multi-environment Docker setup - add dev and prod environments
- v1.2.2 - Production resource management and log rotation (Uses v1.2.2 Docker Images)
- v1.2.3 - Publish images to Docker Hub registry (Uses v1.2.2 Docker Images)
- v1.3.0 - Add due date feature (Uses v1.3.0 Docker Images)

## Environments

### Development
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.dev up -d
```
- Hot reload enabled
- All ports exposed (8000, 5432, 3000, 80)
- Database: taskdb_dev

### Production
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d
```
- Auto-restart enabled
- Only port 80 exposed
- Database: taskdb_prod

## Production Configuration

### Resource Limits
- Database: 0.5 CPU, 1GB RAM
- Backend: 0.5 CPU, 512MB RAM  
- Frontend: 0.25 CPU, 256MB RAM
- Proxy: 0.25 CPU, 256MB RAM

Total: 1.5 CPU cores, 2GB RAM

### Log Rotation
- Max 10MB per log file
- Keep 3 files per container
- Max 30MB logs per container

## Docker Images

Published on Docker Hub:
- Backend: `kacperprzybyla/task-backend`
- Frontend: `kacperprzybyla/task-frontend`
- Proxy: `kacperprzybyla/task-proxy`

### Building and Publishing
```bash
# Build and push new version
./scripts/build-and-push.sh 1.2.3

# Update docker-compose.prod.yml with new version
# Then deploy
```

### Deployment
```bash
# Production (pulls pre-built images)
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d
```
