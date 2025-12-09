import re
from typing import List
from app.models.task import Task, TaskCategory
from app.schemas.graph import GraphNode, GraphEdge, GraphResponse
from app.services.task_classifier import TaskClassifier


class GraphService:
    # Keywords that indicate dependencies
    DEPENDENCY_PATTERNS = [
        (r'after\s+(deploy|release|ship)', TaskCategory.DEPLOY),
        (r'after\s+(message|ping|dm|contact)', TaskCategory.MESSAGE),
        (r'after\s+(email|mail)', TaskCategory.EMAIL),
        (r'after\s+(jira|ticket|issue)', TaskCategory.JIRA_UPDATE),
        (r'once\s+.*(deploy|release|ship)', TaskCategory.DEPLOY),
        (r'when\s+.*(deploy|release|done)', TaskCategory.DEPLOY),
        (r'depends\s+on', None),  # Generic dependency
        (r'blocked\s+by', None),
        (r'waiting\s+for', None),
        (r'after\s+completing', None),
        (r'then\s+', None),  # Sequential indicator
    ]

    @classmethod
    def build_graph(cls, tasks: List[Task]) -> GraphResponse:
        """Build a graph showing task dependencies."""
        nodes = []
        edges = []

        # Create nodes for all tasks with time extraction
        for task in tasks:
            # Extract time from task text
            time_str = TaskClassifier.extract_time(task.clean_text)

            # For reminders, try to get time from due_at if not in text
            if task.category == TaskCategory.REMINDER and not time_str and task.due_at:
                time_str = task.due_at.strftime("%I:%M %p")

            # Get depends_on from task
            depends_on_list = [str(dep_id) for dep_id in task.depends_on]

            nodes.append(GraphNode(
                id=str(task.id),
                label=task.clean_text[:50] + ('...' if len(task.clean_text) > 50 else ''),
                category=task.category,
                time=time_str,
                dependsOn=depends_on_list,
                raw_text=task.raw_text,
                original_message=task.original_message,
                was_improved=task.was_improved or False
            ))

        # Create edges based on explicit depends_on relationships first
        for task in tasks:
            for dep_id in task.depends_on:
                edges.append(GraphEdge(
                    source=str(dep_id),
                    target=str(task.id),
                    label="depends"
                ))

        # Group tasks by category for heuristic dependency detection
        tasks_by_category = {}
        for task in tasks:
            if task.category not in tasks_by_category:
                tasks_by_category[task.category] = []
            tasks_by_category[task.category].append(task)

        # Find additional dependencies from text analysis (only if no explicit depends_on)
        for task in tasks:
            if task.depends_on:  # Skip if already has explicit dependencies
                continue

            text_lower = task.clean_text.lower()

            for pattern, dep_category in cls.DEPENDENCY_PATTERNS:
                if re.search(pattern, text_lower):
                    if dep_category and dep_category in tasks_by_category:
                        # Link to tasks of the specified category
                        for dep_task in tasks_by_category[dep_category]:
                            if dep_task.id != task.id:
                                edges.append(GraphEdge(
                                    source=str(dep_task.id),
                                    target=str(task.id),
                                    label="blocks"
                                ))
                    elif dep_category is None:
                        # Try to find referenced task by keyword matching
                        cls._find_keyword_dependencies(task, tasks, edges, text_lower)

        # Remove duplicate edges
        seen_edges = set()
        unique_edges = []
        for edge in edges:
            edge_key = (edge.source, edge.target)
            if edge_key not in seen_edges:
                seen_edges.add(edge_key)
                unique_edges.append(edge)

        return GraphResponse(nodes=nodes, edges=unique_edges)

    @classmethod
    def _find_keyword_dependencies(
        cls,
        task: Task,
        all_tasks: List[Task],
        edges: List[GraphEdge],
        text_lower: str
    ):
        """Find dependencies based on keyword matching."""
        # Extract potential task references
        words = set(re.findall(r'\b\w{4,}\b', text_lower))

        for other_task in all_tasks:
            if other_task.id == task.id:
                continue

            other_words = set(re.findall(r'\b\w{4,}\b', other_task.clean_text.lower()))

            # Check for significant word overlap
            common_words = words & other_words
            # Filter out common words
            common_words -= {'this', 'that', 'with', 'from', 'have', 'been', 'will', 'would', 'could', 'should'}

            if len(common_words) >= 2:
                # Check if this task mentions waiting/depending on something
                if any(kw in text_lower for kw in ['after', 'once', 'when', 'depends', 'blocked', 'waiting']):
                    edges.append(GraphEdge(
                        source=str(other_task.id),
                        target=str(task.id),
                        label="related"
                    ))
