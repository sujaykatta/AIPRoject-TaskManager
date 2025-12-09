import enum
from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class ReminderStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    remind_at = Column(DateTime, nullable=False)
    status = Column(Enum(ReminderStatus), default=ReminderStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="reminders")
