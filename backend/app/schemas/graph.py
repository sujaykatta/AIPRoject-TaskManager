from typing import List, Optional
from pydantic import BaseModel
from app.models.task import TaskCategory


class GraphNode(BaseModel):
    id: str
    label: str
    category: TaskCategory
    time: str | None = None
    dependsOn: List[str] = []
    # Additional fields for task detail modal
    raw_text: Optional[str] = None
    original_message: Optional[str] = None
    was_improved: bool = False


class GraphEdge(BaseModel):
    source: str
    target: str
    label: str | None = None


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
