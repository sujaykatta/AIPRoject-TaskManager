from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, field_validator
from app.models.task import TaskCategory, TaskStatus, TaskPriority, Task


class TaskCreate(BaseModel):
    raw_text: str
    category: Optional[TaskCategory] = None
    status: Optional[TaskStatus] = TaskStatus.TODO
    priority: Optional[TaskPriority] = TaskPriority.MEDIUM
    due_at: Optional[datetime] = None
    depends_on: List[int] = []
    original_message: Optional[str] = None
    jira_ticket: Optional[str] = None
    assigned_to: Optional[str] = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskUpdate(BaseModel):
    """For updating task details including after re-analysis."""
    clean_text: Optional[str] = None
    category: Optional[TaskCategory] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_at: Optional[datetime] = None
    jira_ticket: Optional[str] = None
    assigned_to: Optional[str] = None


class ReminderInTask(BaseModel):
    id: int
    remind_at: datetime
    status: str

    class Config:
        from_attributes = True


class ImprovementRecord(BaseModel):
    timestamp: str
    old_text: str
    new_text: str
    reason: Optional[str] = None


class TaskResponse(BaseModel):
    id: int
    user_id: str
    raw_text: str
    clean_text: str
    original_message: Optional[str] = None
    category: TaskCategory
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    jira_ticket: Optional[str] = None
    assigned_to: Optional[str] = None
    due_at: Optional[datetime] = None
    was_improved: bool = False
    improvement_history: List[ImprovementRecord] = []
    created_at: datetime
    updated_at: datetime
    reminders: List[ReminderInTask] = []
    depends_on: List[int] = []

    class Config:
        from_attributes = True

    @field_validator('depends_on', mode='before')
    @classmethod
    def parse_depends_on(cls, v):
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return []
        return v or []

    @field_validator('improvement_history', mode='before')
    @classmethod
    def parse_improvement_history(cls, v):
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return []
        return v or []

    @classmethod
    def from_task(cls, task: Task) -> "TaskResponse":
        return cls(
            id=task.id,
            user_id=task.user_id,
            raw_text=task.raw_text,
            clean_text=task.clean_text,
            original_message=task.original_message,
            category=task.category,
            status=task.status or TaskStatus.TODO,
            priority=task.priority or TaskPriority.MEDIUM,
            jira_ticket=task.jira_ticket,
            assigned_to=task.assigned_to,
            due_at=task.due_at,
            was_improved=task.was_improved or False,
            improvement_history=task.improvement_history or [],
            created_at=task.created_at,
            updated_at=task.updated_at,
            reminders=[ReminderInTask.model_validate(r) for r in task.reminders],
            depends_on=task.depends_on,
        )


class TaskParseRequest(BaseModel):
    text: str
    original_message: Optional[str] = None  # Full message context


class TaskParseResponse(BaseModel):
    tasks: List[TaskResponse]
    count: int
    filtered_count: int = 0  # How many tasks were filtered as invalid


class MessageSuggestion(BaseModel):
    suggested_message: str


class EmailSuggestion(BaseModel):
    subject: str
    body: str


class DeployChecklist(BaseModel):
    items: List[str]


# Message Analysis schemas
class TeamMemberProfile(BaseModel):
    name: str
    nicknames: List[str] = []
    role: Optional[str] = None


class UserProfileInput(BaseModel):
    name: str
    nicknames: List[str] = []
    role: str = ""
    teamMembers: List[TeamMemberProfile] = []
    reportsTo: List[str] = []
    tonePreference: str = "friendly"


class MessageAnalysisRequest(BaseModel):
    text: str
    user_profile: UserProfileInput


class ImprovedMessage(BaseModel):
    original: str
    improved: str
    category: str


class ExtractedTask(BaseModel):
    text: str
    original_text: Optional[str] = None
    category: str
    assigned_to: str
    due_date: Optional[str] = None
    priority: str = "medium"
    is_valid: bool = True
    jira_ticket: Optional[str] = None


class MessageAnalysisResponse(BaseModel):
    relevant_to_user: bool
    summary: str
    improved_messages: List[ImprovedMessage]
    tasks: List[ExtractedTask]


# Re-analysis schemas
class ReanalyzeRequest(BaseModel):
    """Request to re-analyze existing tasks."""
    task_ids: Optional[List[int]] = None  # If None, reanalyze all tasks


class ReanalyzeResult(BaseModel):
    """Result of task re-analysis."""
    task_id: int
    was_improved: bool
    old_text: str
    new_text: Optional[str] = None
    old_category: str
    new_category: Optional[str] = None
    was_removed: bool = False
    reason: Optional[str] = None


class ReanalyzeResponse(BaseModel):
    """Response from re-analysis endpoint."""
    improved_count: int
    removed_count: int
    unchanged_count: int
    results: List[ReanalyzeResult]
