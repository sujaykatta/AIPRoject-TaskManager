import re
from app.models.task import TaskCategory


class TaskClassifier:
    DEPLOY_KEYWORDS = [
        "deploy", "release", "push to prod", "production", "ship", "launch",
        "rollout", "go live", "merge to main", "ci/cd", "pipeline"
    ]

    MESSAGE_KEYWORDS = [
        "ping", "message", "dm", "slack", "teams", "chat", "tell", "ask",
        "reach out", "contact", "quick note", "follow up with"
    ]

    EMAIL_KEYWORDS = [
        "email", "mail", "send to", "compose", "draft", "cc", "bcc",
        "subject:", "dear", "regards", "formal"
    ]

    REMINDER_KEYWORDS = [
        "remind", "reminder", "tomorrow", "next week", "next month",
        "by end of", "deadline", "due", "schedule", "calendar",
        "don't forget", "remember to"
    ]

    JIRA_KEYWORDS = [
        "jira", "ticket", "issue", "bug", "story", "epic", "sprint",
        "backlog", "kanban", "update ticket", "close ticket", "assign",
        "status update", "move to", "in progress", "code review"
    ]

    @classmethod
    def classify(cls, text: str) -> TaskCategory:
        text_lower = text.lower()

        # Check Jira first as it's specific
        for keyword in cls.JIRA_KEYWORDS:
            if keyword in text_lower:
                return TaskCategory.JIRA_UPDATE

        for keyword in cls.DEPLOY_KEYWORDS:
            if keyword in text_lower:
                return TaskCategory.DEPLOY

        for keyword in cls.MESSAGE_KEYWORDS:
            if keyword in text_lower:
                return TaskCategory.MESSAGE

        for keyword in cls.EMAIL_KEYWORDS:
            if keyword in text_lower:
                return TaskCategory.EMAIL

        for keyword in cls.REMINDER_KEYWORDS:
            if keyword in text_lower:
                return TaskCategory.REMINDER

        # Check for time patterns (e.g., "at 3pm", "by Friday")
        time_patterns = [
            r'\b(at|by|before|after)\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b',
            r'\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b',
            r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b',
        ]
        for pattern in time_patterns:
            if re.search(pattern, text_lower):
                return TaskCategory.REMINDER

        return TaskCategory.OTHER

    @classmethod
    def clean_text(cls, raw_text: str) -> str:
        """Clean and normalize task text."""
        text = raw_text.strip()
        # Remove common prefixes like "- ", "* ", "• ", numbers
        text = re.sub(r'^[\-\*\•\d\.]+\s*', '', text)
        return text.strip()

    @classmethod
    def extract_time(cls, text: str) -> str | None:
        """Extract time reference from task text."""
        text_lower = text.lower()

        # Common time patterns
        patterns = [
            r'(\d{1,2}:\d{2}\s*(am|pm)?)',
            r'(\d{1,2}\s*(am|pm))',
            r'(tomorrow|today|tonight)',
            r'(next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month))',
            r'(at\s+\d{1,2}(:\d{2})?\s*(am|pm)?)',
            r'(by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))',
            r'(in\s+\d+\s+(hours?|minutes?|days?))',
        ]

        for pattern in patterns:
            match = re.search(pattern, text_lower)
            if match:
                return match.group(0)

        return None
