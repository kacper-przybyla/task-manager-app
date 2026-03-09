# Task Manager Application

A production-ready 3-tier task management system built with React, FastAPI, and PostgreSQL.

## Architecture
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** FastAPI + SQLAlchemy
- **Database:** PostgreSQL 14
- **Proxy:** Nginx reverse proxy

## Quick Start
```bash
docker compose up -d --build
```
Visit: http://localhost

## Versions
- v1.0.0 - Base CRUD operations

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