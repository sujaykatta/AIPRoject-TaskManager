from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.task import Task
from app.schemas.graph import GraphResponse
from app.services.graph_service import GraphService

router = APIRouter(tags=["graph"])


@router.get("/graph", response_model=GraphResponse)
def get_graph(db: Session = Depends(get_db)):
    """Get task dependency graph."""
    tasks = db.query(Task).filter(Task.user_id == "1").all()
    return GraphService.build_graph(tasks)
