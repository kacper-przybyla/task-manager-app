from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
import logging
import sys

from .config import settings
from .database import get_db, engine, Base
from .models import Task

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None


# Health check endpoint
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "disconnected"

    return {
        "status": "healthy",
        "environment": settings.environment,
        "database_status": db_status,
        "version": settings.app_version
    }


# Task endpoints
@app.get("/tasks", response_model=List[dict])
async def get_tasks(db: Session = Depends(get_db)):
    """Get all tasks"""
    logger.info("Fetching all tasks")
    tasks = db.query(Task).order_by(Task.created_at.desc()).all()
    return [task.to_dict() for task in tasks]


@app.post("/tasks", response_model=dict, status_code=201)
async def create_task(task_data: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task"""
    logger.info(f"Creating task: {task_data.title}")

    task = Task(
        title=task_data.title,
        description=task_data.description
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    return task.to_dict()


@app.get("/tasks/{task_id}", response_model=dict)
async def get_task(task_id: int, db: Session = Depends(get_db)):
    """Get a specific task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task.to_dict()


@app.put("/tasks/{task_id}", response_model=dict)
async def replace_task(task_id: int, task_data: TaskCreate, db: Session = Depends(get_db)):
    """Full replacement of a task (title required, description optional)"""
    logger.info(f"Replacing task {task_id}")

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.title = task_data.title
    task.description = task_data.description

    db.commit()
    db.refresh(task)

    return task.to_dict()


@app.patch("/tasks/{task_id}", response_model=dict)
async def update_task(task_id: int, task_data: TaskUpdate, db: Session = Depends(get_db)):
    """Partial update of a task"""
    logger.info(f"Updating task {task_id}")

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task_data.title is not None:
        task.title = task_data.title
    if task_data.description is not None:
        task.description = task_data.description
    if task_data.completed is not None:
        task.completed = task_data.completed

    db.commit()
    db.refresh(task)

    return task.to_dict()


@app.patch("/tasks/{task_id}/toggle", response_model=dict)
async def toggle_task(task_id: int, db: Session = Depends(get_db)):
    """Toggle the completed status of a task"""
    logger.info(f"Toggling task {task_id}")

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.completed = not task.completed

    db.commit()
    db.refresh(task)

    return task.to_dict()


@app.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task"""
    logger.info(f"Deleting task {task_id}")

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()

    return None


# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"CORS origins: {settings.cors_origins}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
