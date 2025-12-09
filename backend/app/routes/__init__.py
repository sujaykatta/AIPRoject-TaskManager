from app.routes.tasks import router as tasks_router
from app.routes.reminders import router as reminders_router
from app.routes.graph import router as graph_router
from app.routes.teams import router as teams_router

__all__ = ["tasks_router", "reminders_router", "graph_router", "teams_router"]
