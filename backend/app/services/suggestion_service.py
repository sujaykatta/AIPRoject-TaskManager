from app.models.task import Task, TaskCategory


class SuggestionService:
    @staticmethod
    def suggest_message(task: Task) -> str:
        """Generate a suggested short message/DM based on task text."""
        clean = task.clean_text.lower()

        # Extract potential recipient if mentioned
        recipient = "there"
        for word in ["to", "with", "ping", "message", "dm", "tell", "ask"]:
            if word in clean:
                parts = clean.split(word)
                if len(parts) > 1:
                    potential = parts[1].strip().split()[0] if parts[1].strip() else ""
                    if potential and len(potential) > 1:
                        recipient = potential.title()
                        break

        # Generate message based on content
        if "update" in clean or "status" in clean:
            return f"Hey {recipient}! Quick question - could you share an update on this? Thanks!"
        elif "review" in clean:
            return f"Hey {recipient}! When you get a chance, could you take a look at this? No rush!"
        elif "help" in clean or "assist" in clean:
            return f"Hey {recipient}! Would you have a few minutes to help me with something?"
        elif "meeting" in clean or "call" in clean:
            return f"Hey {recipient}! Would you be free for a quick sync sometime today or tomorrow?"
        elif "question" in clean:
            return f"Hey {recipient}! Quick question for you when you have a moment."
        else:
            # Generic message based on task
            return f"Hey {recipient}! Quick note about: {task.clean_text[:50]}{'...' if len(task.clean_text) > 50 else ''}"

    @staticmethod
    def suggest_email(task: Task) -> tuple[str, str]:
        """Generate suggested email subject and body."""
        clean = task.clean_text.lower()
        clean_text = task.clean_text

        # Determine email type and generate appropriate content
        if "report" in clean or "summary" in clean:
            subject = f"Report: {clean_text[:40]}{'...' if len(clean_text) > 40 else ''}"
            body = f"""Hi,

Please find below the report regarding {clean_text.lower()}.

Summary:
- [Key point 1]
- [Key point 2]
- [Key point 3]

Please let me know if you need any additional information.

Best regards"""

        elif "request" in clean or "approval" in clean:
            subject = f"Request: {clean_text[:40]}{'...' if len(clean_text) > 40 else ''}"
            body = f"""Hi,

I am writing to request your approval/assistance with the following matter:

{clean_text}

Please let me know if you need any additional details to proceed.

Thank you for your time.

Best regards"""

        elif "follow up" in clean or "following up" in clean:
            subject = f"Follow Up: {clean_text[:40]}{'...' if len(clean_text) > 40 else ''}"
            body = f"""Hi,

I wanted to follow up on our previous discussion regarding:

{clean_text}

Please let me know if there are any updates or if you need any additional information from my end.

Best regards"""

        elif "update" in clean:
            subject = f"Update: {clean_text[:40]}{'...' if len(clean_text) > 40 else ''}"
            body = f"""Hi,

I wanted to provide you with an update on the following:

{clean_text}

Key updates:
- [Update 1]
- [Update 2]

Please let me know if you have any questions.

Best regards"""

        else:
            subject = f"Regarding: {clean_text[:40]}{'...' if len(clean_text) > 40 else ''}"
            body = f"""Hi,

I am reaching out regarding the following matter:

{clean_text}

[Additional details here]

Please let me know if you have any questions or need further clarification.

Best regards"""

        return subject, body

    @staticmethod
    def suggest_deploy_checklist(task: Task) -> list[str]:
        """Generate a deployment checklist based on task text."""
        clean = task.clean_text.lower()

        checklist = []

        # Always start with these
        checklist.append("Review and merge all pending PRs for this release")
        checklist.append("Run full test suite and verify all tests pass")

        # Add based on context
        if "database" in clean or "db" in clean or "migration" in clean:
            checklist.append("Create and test database migration scripts")
            checklist.append("Backup production database before deployment")

        if "api" in clean or "backend" in clean:
            checklist.append("Update API documentation if endpoints changed")
            checklist.append("Verify API versioning is correct")

        if "frontend" in clean or "ui" in clean:
            checklist.append("Build and test production frontend bundle")
            checklist.append("Verify all assets are properly minified")

        # Standard deployment steps
        checklist.append("Update environment variables if needed")
        checklist.append("Create deployment tag/release in git")
        checklist.append("Deploy to staging environment first")
        checklist.append("Run smoke tests on staging")
        checklist.append("Deploy to production")
        checklist.append("Monitor logs and metrics for errors")
        checklist.append("Verify deployment success with health checks")
        checklist.append("Notify team of successful deployment")

        if "rollback" in clean:
            checklist.append("Document rollback procedure and test it")

        return checklist
