from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.task import Task
from app.models.reminder import Reminder, ReminderStatus
from app.schemas.reminder import ReminderCreate, ReminderResponse

router = APIRouter(tags=["reminders"])


@router.post("/tasks/{task_id}/reminders", response_model=ReminderResponse)
def create_reminder(task_id: int, request: ReminderCreate, db: Session = Depends(get_db)):
    """Create a reminder for a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    reminder = Reminder(
        task_id=task_id,
        remind_at=request.remind_at,
        status=ReminderStatus.PENDING,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    return ReminderResponse(
        id=reminder.id,
        task_id=reminder.task_id,
        remind_at=reminder.remind_at,
        status=reminder.status,
        created_at=reminder.created_at,
        task_text=task.clean_text,
    )


@router.get("/reminders", response_model=List[ReminderResponse])
def get_reminders(db: Session = Depends(get_db)):
    """Get all reminders."""
    reminders = (
        db.query(Reminder)
        .join(Task)
        .filter(Task.user_id == "1")
        .order_by(Reminder.remind_at)
        .all()
    )

    return [
        ReminderResponse(
            id=r.id,
            task_id=r.task_id,
            remind_at=r.remind_at,
            status=r.status,
            created_at=r.created_at,
            task_text=r.task.clean_text,
        )
        for r in reminders
    ]


@router.get("/reminders/pending", response_model=List[ReminderResponse])
def get_pending_reminders(db: Session = Depends(get_db)):
    """Get pending reminders."""
    reminders = (
        db.query(Reminder)
        .join(Task)
        .filter(Task.user_id == "1", Reminder.status == ReminderStatus.PENDING)
        .order_by(Reminder.remind_at)
        .all()
    )

    return [
        ReminderResponse(
            id=r.id,
            task_id=r.task_id,
            remind_at=r.remind_at,
            status=r.status,
            created_at=r.created_at,
            task_text=r.task.clean_text,
        )
        for r in reminders
    ]


@router.get("/notifications", response_model=List[ReminderResponse])
def get_notifications(db: Session = Depends(get_db)):
    """Get reminders that are due (for polling)."""
    now = datetime.utcnow()
    reminders = (
        db.query(Reminder)
        .join(Task)
        .filter(
            Task.user_id == "1",
            Reminder.status == ReminderStatus.PENDING,
            Reminder.remind_at <= now,
        )
        .order_by(Reminder.remind_at)
        .all()
    )

    return [
        ReminderResponse(
            id=r.id,
            task_id=r.task_id,
            remind_at=r.remind_at,
            status=r.status,
            created_at=r.created_at,
            task_text=r.task.clean_text,
        )
        for r in reminders
    ]


@router.delete("/reminders/{reminder_id}")
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    """Delete a reminder."""
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(reminder)
    db.commit()
    return {"message": "Reminder deleted successfully"}
