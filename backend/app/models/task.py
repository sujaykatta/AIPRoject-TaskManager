import enum
import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class TaskCategory(str, enum.Enum):
    DEPLOY = "deploy"
    MESSAGE = "message"
    EMAIL = "email"
    REMINDER = "reminder"
    JIRA_UPDATE = "jira_update"
    OTHER = "other"


class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class TaskPriority(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), default="1", index=True)

    # Original user input (never modified)
    raw_text = Column(Text, nullable=False)

    # AI-improved/cleaned version of the task
    clean_text = Column(Text, nullable=False)

    # Full original message context (for viewing in Graph modal)
    original_message = Column(Text, nullable=True)

    # Task metadata
    category = Column(Enum(TaskCategory), default=TaskCategory.OTHER)
    status = Column(Enum(TaskStatus), default=TaskStatus.TODO)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM)

    # Jira integration
    jira_ticket = Column(String(50), nullable=True)

    # Assignment
    assigned_to = Column(String(100), nullable=True)

    # Timing
    due_at = Column(DateTime, nullable=True)

    # Dependencies stored as JSON
    depends_on_json = Column(Text, default="[]")

    # Improvement tracking
    was_improved = Column(Boolean, default=False)
    improvement_history_json = Column(Text, default="[]")

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reminders = relationship("Reminder", back_populates="task", cascade="all, delete-orphan")

    @property
    def depends_on(self) -> list[int]:
        """Get depends_on as a list of integers."""
        try:
            return json.loads(self.depends_on_json or "[]")
        except (json.JSONDecodeError, TypeError):
            return []

    @depends_on.setter
    def depends_on(self, value: list[int]):
        """Set depends_on from a list of integers."""
        self.depends_on_json = json.dumps(value or [])

    @property
    def improvement_history(self) -> list[dict]:
        """Get improvement history as a list of dicts."""
        try:
            return json.loads(self.improvement_history_json or "[]")
        except (json.JSONDecodeError, TypeError):
            return []

    @improvement_history.setter
    def improvement_history(self, value: list[dict]):
        """Set improvement history from a list of dicts."""
        self.improvement_history_json = json.dumps(value or [])

    def add_improvement(self, old_text: str, new_text: str, reason: str = None):
        """Add an improvement record to history."""
        history = self.improvement_history
        history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "old_text": old_text,
            "new_text": new_text,
            "reason": reason
        })
        self.improvement_history = history
        self.was_improved = True
