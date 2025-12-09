from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.task import Task, TaskCategory, TaskStatus, TaskPriority
from app.schemas.task import (
    TaskResponse,
    TaskParseRequest,
    TaskParseResponse,
    TaskStatusUpdate,
    TaskUpdate,
    MessageSuggestion,
    EmailSuggestion,
    DeployChecklist,
    MessageAnalysisRequest,
    MessageAnalysisResponse,
    ReanalyzeRequest,
    ReanalyzeResponse,
    ReanalyzeResult,
)
from app.services.task_classifier import TaskClassifier
from app.services.suggestion_service import SuggestionService
from app.services.ai_service import AIService, TaskValidator

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/parse", response_model=TaskParseResponse)
async def parse_tasks(request: TaskParseRequest, db: Session = Depends(get_db)):
    """
    Parse multiline text into individual tasks using AI.
    Now includes strict validation to filter out meaningless tasks.
    """
    lines = request.text.strip().split('\n')
    clean_lines = []
    line_mapping = []  # Maps clean line index to original line

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        clean_text = TaskClassifier.clean_text(line)
        if clean_text:
            clean_lines.append(clean_text)
            line_mapping.append((i, line, clean_text))

    if not clean_lines:
        return TaskParseResponse(tasks=[], count=0, filtered_count=0)

    # Use AI to analyze all tasks at once with strict validation
    print(f"[AI] Analyzing {len(clean_lines)} tasks with strict validation...")
    ai_results = await AIService.analyze_tasks(clean_lines)
    print(f"[AI] Analysis complete: {len(ai_results)} results")

    created_tasks = []
    task_id_map = {}  # Maps 1-indexed position to actual task ID
    filtered_count = 0

    # First pass: create only valid tasks
    for idx, (orig_idx, raw_text, clean_text) in enumerate(line_mapping):
        ai_result = ai_results[idx] if idx < len(ai_results) else {}

        # Check if AI marked this task as invalid
        if not ai_result.get("is_valid", True):
            print(f"[FILTER] Skipping invalid task: '{clean_text[:50]}...' - Reason: {ai_result.get('reason', 'unknown')}")
            filtered_count += 1
            continue

        # Additional validation check
        if not TaskValidator.is_meaningful_task(clean_text, raw_text):
            print(f"[FILTER] Task failed validation: '{clean_text[:50]}...'")
            filtered_count += 1
            continue

        # Get category from AI or fallback to classifier
        category_str = ai_result.get("category", "other")
        try:
            category = TaskCategory(category_str)
        except ValueError:
            category = TaskClassifier.classify(clean_text)

        # Use improved text if provided
        final_clean_text = ai_result.get("improved_text") or clean_text

        # Determine priority
        priority_str = ai_result.get("priority", "medium")
        try:
            priority = TaskPriority(priority_str)
        except ValueError:
            priority = TaskPriority.MEDIUM

        task = Task(
            user_id="1",
            raw_text=raw_text,
            clean_text=final_clean_text,
            original_message=request.original_message,
            category=category,
            status=TaskStatus.TODO,  # Ensure status is always set
            priority=priority,
            jira_ticket=ai_result.get("jira_ticket"),
            assigned_to=ai_result.get("assigned_to"),
            was_improved=bool(ai_result.get("improved_text")),
        )
        db.add(task)
        db.flush()  # Get the ID without committing
        created_tasks.append((task, ai_result, idx + 1))
        task_id_map[idx + 1] = task.id  # 1-indexed for AI results

    # Second pass: set dependencies using actual task IDs
    for task, ai_result, original_idx in created_tasks:
        depends_on_indices = ai_result.get("depends_on_indices", [])
        depends_on_ids = []
        for dep_idx in depends_on_indices:
            if dep_idx in task_id_map and dep_idx != original_idx:
                depends_on_ids.append(task_id_map[dep_idx])
        task.depends_on = depends_on_ids

    db.commit()

    # Refresh to get final state
    result_tasks = []
    for task, _, _ in created_tasks:
        db.refresh(task)
        result_tasks.append(TaskResponse.from_task(task))

    print(f"[RESULT] Created {len(result_tasks)} tasks, filtered {filtered_count} invalid tasks")
    return TaskParseResponse(tasks=result_tasks, count=len(result_tasks), filtered_count=filtered_count)


@router.get("", response_model=List[TaskResponse])
def get_tasks(db: Session = Depends(get_db)):
    """Get all tasks for the mock user."""
    tasks = db.query(Task).filter(Task.user_id == "1").order_by(Task.created_at.desc()).all()

    # Ensure all tasks have valid status for Kanban
    result = []
    for t in tasks:
        # Fix any null status
        if t.status is None:
            t.status = TaskStatus.TODO
            db.commit()
        result.append(TaskResponse.from_task(t))

    return result


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    """Get a single task by ID."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse.from_task(task)


@router.delete("")
def delete_all_tasks(db: Session = Depends(get_db)):
    """Delete all tasks for the current user."""
    deleted_count = db.query(Task).filter(Task.user_id == "1").delete()
    db.commit()
    return {"deleted_count": deleted_count, "message": "All tasks deleted successfully"}


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task by ID."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}


@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status(task_id: int, status_update: TaskStatusUpdate, db: Session = Depends(get_db)):
    """Update a task's status (for Kanban board)."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = status_update.status
    db.commit()
    db.refresh(task)
    return TaskResponse.from_task(task)


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_update: TaskUpdate, db: Session = Depends(get_db)):
    """Update a task's details."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Track improvement if clean_text is being updated
    if task_update.clean_text and task_update.clean_text != task.clean_text:
        task.add_improvement(task.clean_text, task_update.clean_text, "Manual edit")

    # Update fields if provided
    if task_update.clean_text is not None:
        task.clean_text = task_update.clean_text
    if task_update.category is not None:
        task.category = task_update.category
    if task_update.status is not None:
        task.status = task_update.status
    if task_update.priority is not None:
        task.priority = task_update.priority
    if task_update.due_at is not None:
        task.due_at = task_update.due_at
    if task_update.jira_ticket is not None:
        task.jira_ticket = task_update.jira_ticket
    if task_update.assigned_to is not None:
        task.assigned_to = task_update.assigned_to

    db.commit()
    db.refresh(task)
    return TaskResponse.from_task(task)


@router.post("/{task_id}/suggest/message", response_model=MessageSuggestion)
async def suggest_message(task_id: int, db: Session = Depends(get_db)):
    """Generate a suggested message for a task using AI."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Use AI for suggestion
    suggested = await AIService.suggest_message(task.clean_text)
    return MessageSuggestion(suggested_message=suggested)


@router.post("/{task_id}/suggest/email", response_model=EmailSuggestion)
async def suggest_email(task_id: int, db: Session = Depends(get_db)):
    """Generate a suggested email for a task using AI."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Use AI for suggestion
    subject, body = await AIService.suggest_email(task.clean_text)
    return EmailSuggestion(subject=subject, body=body)


@router.post("/{task_id}/suggest/deploy-checklist", response_model=DeployChecklist)
async def suggest_deploy_checklist(task_id: int, db: Session = Depends(get_db)):
    """Generate a deployment checklist for a task using AI."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Use AI for checklist
    items = await AIService.suggest_deploy_checklist(task.clean_text)
    return DeployChecklist(items=items)


@router.post("/analyze", response_model=MessageAnalysisResponse)
async def analyze_messages(request: MessageAnalysisRequest):
    """
    Intelligently analyze messy messages and extract relevant tasks.

    Uses AI to:
    - Determine if content is relevant to the user
    - Extract and categorize tasks
    - Rewrite messy messages professionally
    - Identify priorities and due dates

    Now with strict validation to prevent garbage tasks.
    """
    if not request.text.strip():
        return MessageAnalysisResponse(
            relevant_to_user=False,
            summary="No message provided to analyze.",
            improved_messages=[],
            tasks=[]
        )

    # Convert Pydantic model to dict for AI service
    profile_dict = request.user_profile.model_dump()

    result = await AIService.analyze_messages(request.text, profile_dict)

    return MessageAnalysisResponse(
        relevant_to_user=result.get("relevant_to_user", True),
        summary=result.get("summary", "Analysis complete."),
        improved_messages=result.get("improved_messages", []),
        tasks=result.get("tasks", [])
    )


@router.post("/reanalyze", response_model=ReanalyzeResponse)
async def reanalyze_tasks(request: ReanalyzeRequest, db: Session = Depends(get_db)):
    """
    Re-analyze existing tasks to improve their quality.

    This endpoint:
    - Reviews all existing tasks (or specified task IDs)
    - Uses AI to improve wording and fix categorization
    - Removes tasks that are noise/garbage
    - Updates the database with improvements
    - Returns detailed results of what changed
    """
    # Get tasks to reanalyze
    if request.task_ids:
        tasks = db.query(Task).filter(Task.id.in_(request.task_ids)).all()
    else:
        tasks = db.query(Task).filter(Task.user_id == "1").all()

    if not tasks:
        return ReanalyzeResponse(
            improved_count=0,
            removed_count=0,
            unchanged_count=0,
            results=[]
        )

    # Prepare tasks for AI analysis
    task_dicts = [{
        'id': t.id,
        'text': t.clean_text,
        'clean_text': t.clean_text,
        'raw_text': t.raw_text,
        'category': t.category.value if t.category else 'other'
    } for t in tasks]

    print(f"[REANALYZE] Starting reanalysis of {len(tasks)} tasks...")

    # Call AI to reanalyze
    improved_tasks = await AIService.reanalyze_tasks(task_dicts)

    # Build lookup of improvements
    improvement_lookup = {}
    for imp_task in improved_tasks:
        if 'id' in imp_task:
            improvement_lookup[imp_task['id']] = imp_task

    results = []
    improved_count = 0
    removed_count = 0
    unchanged_count = 0

    for task in tasks:
        old_text = task.clean_text
        old_category = task.category.value if task.category else 'other'

        if task.id in improvement_lookup:
            imp = improvement_lookup[task.id]

            # Check if task should be removed (not in improved list means it's noise)
            if not imp.get('is_valid', True):
                # Mark for deletion
                db.delete(task)
                removed_count += 1
                results.append(ReanalyzeResult(
                    task_id=task.id,
                    was_improved=False,
                    old_text=old_text,
                    old_category=old_category,
                    was_removed=True,
                    reason=imp.get('reason', 'Identified as noise/invalid')
                ))
            else:
                # Apply improvements
                new_text = imp.get('clean_text', old_text)
                new_category = imp.get('category', old_category)

                if new_text != old_text or new_category != old_category:
                    # Track the improvement
                    task.add_improvement(old_text, new_text, "AI re-analysis")
                    task.clean_text = new_text

                    try:
                        task.category = TaskCategory(new_category)
                    except ValueError:
                        pass  # Keep original category

                    improved_count += 1
                    results.append(ReanalyzeResult(
                        task_id=task.id,
                        was_improved=True,
                        old_text=old_text,
                        new_text=new_text,
                        old_category=old_category,
                        new_category=new_category
                    ))
                else:
                    unchanged_count += 1
                    results.append(ReanalyzeResult(
                        task_id=task.id,
                        was_improved=False,
                        old_text=old_text,
                        old_category=old_category
                    ))
        else:
            # Task not in improved list - might have been filtered out as noise
            # Keep unchanged for safety
            unchanged_count += 1
            results.append(ReanalyzeResult(
                task_id=task.id,
                was_improved=False,
                old_text=old_text,
                old_category=old_category
            ))

    db.commit()

    print(f"[REANALYZE] Complete: {improved_count} improved, {removed_count} removed, {unchanged_count} unchanged")

    return ReanalyzeResponse(
        improved_count=improved_count,
        removed_count=removed_count,
        unchanged_count=unchanged_count,
        results=results
    )
