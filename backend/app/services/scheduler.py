from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.reminder import Reminder, ReminderStatus


def check_reminders():
    """Check for due reminders and mark them as sent."""
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        due_reminders = (
            db.query(Reminder)
            .filter(
                Reminder.status == ReminderStatus.PENDING,
                Reminder.remind_at <= now,
            )
            .all()
        )

        for reminder in due_reminders:
            print(f"[REMINDER] Fired for task {reminder.task_id}: {reminder.task.clean_text}")
            reminder.status = ReminderStatus.SENT
            db.add(reminder)

        if due_reminders:
            db.commit()
            print(f"[OK] Processed {len(due_reminders)} reminder(s)")

    except Exception as e:
        print(f"[ERROR] Error checking reminders: {e}")
        db.rollback()
    finally:
        db.close()


# Global scheduler instance
scheduler = BackgroundScheduler()


def start_scheduler():
    """Start the background scheduler."""
    if not scheduler.running:
        scheduler.add_job(
            check_reminders,
            trigger=IntervalTrigger(seconds=30),
            id="check_reminders",
            name="Check for due reminders",
            replace_existing=True,
        )
        scheduler.start()
        print("[SCHEDULER] Reminder scheduler started (checking every 30 seconds)")


def stop_scheduler():
    """Stop the background scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        print("[SCHEDULER] Reminder scheduler stopped")
