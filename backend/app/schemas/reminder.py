from datetime import datetime
from pydantic import BaseModel
from app.models.reminder import ReminderStatus


class ReminderCreate(BaseModel):
    remind_at: datetime


class ReminderResponse(BaseModel):
    id: int
    task_id: int
    remind_at: datetime
    status: ReminderStatus
    created_at: datetime
    task_text: str | None = None

    class Config:
        from_attributes = True
