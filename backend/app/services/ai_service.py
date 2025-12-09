import json
import re
import google.generativeai as genai
from typing import Optional, List
from app.core.config import settings
from app.models.task import TaskCategory

# Configure the API
genai.configure(api_key=settings.GOOGLE_API_KEY)

# Use Gemini 2.5 Flash for fast responses
model = genai.GenerativeModel('gemini-2.5-flash')


# Task validation constants
MIN_TASK_LENGTH = 15  # Minimum characters for a valid task (increased from 10)
MIN_WORD_COUNT = 3    # Minimum words for a valid task

# Comprehensive noise patterns - aggressively filter garbage
NOISE_PATTERNS = [
    r'^[\s\)\(\.\,\;\:\!\?\-\•\*\→]+$',  # Only punctuation/formatting
    r'^(ok|okay|yes|no|thanks|thx|ty|sure|np|k|lol|haha|etc|done|cool|nice|great|hi|hey|hello|bye|goodbye)[\.\!\?\s]*$',
    r'^\d+[\.\)\s]*$',  # Just numbers like "1." or "2)"
    r'^[A-Z]+-\d+\s*$',  # Bare ticket numbers without context (CLPB-1234)
    r'^\s*$',  # Empty or whitespace only
    r'^[\-\•\*\→]+\s*$',  # Just bullet points
    r'^https?://\S+$',  # URLs alone (no context)
    r'^Meeting [Ll]ink\s*$',  # "Meeting Link" without details
    r'^[Ll]ink\s*$',  # Just "Link"
    r'^\S+\.(mp4|mp3|pdf|doc|docx|xls|xlsx|ppt|pptx|png|jpg|jpeg|gif|zip|rar)$',  # File names
    r'^[\w\+]+\.(mp4|mp3|pdf|doc|docx|xls|xlsx|ppt|pptx|png|jpg|jpeg|gif|zip|rar)$',  # File names with special chars
    r'^\[\s*\]$',  # Empty brackets
    r'^cc:?\s*$',  # Just "cc:" without content
    r'^fyi\s*$',  # Just "FYI" without content
    r'^re:\s*$',  # Just "RE:" without content
    r'^fw:\s*$',  # Just "FW:" without content
    r'^:\)|:\(|;\)|:D|:P|<3|👍|👎|✅|❌|🎉|💯$',  # Just emojis/emoticons
    r'^[\w\s]{1,5}$',  # Very short text (1-5 chars)
    r'^[A-Z][a-z]+$',  # Single capitalized word
]

# Patterns that indicate non-actionable content
NON_ACTIONABLE_PATTERNS = [
    r'^(here is|here\'s|this is|attached is|see below|see above|fyi|for your information)\b',
    r'^(just|only|simply)\s+(wanted to|letting you know|informing)',
    r'^(good|great|nice|awesome|excellent|perfect|wonderful)\s+(job|work|stuff)!?$',
    r'^(noted|acknowledged|received|got it|understood)[\.\!\s]*$',
    r'^(sounds good|looks good|lgtm|works for me)[\.\!\s]*$',
]

ACTION_VERBS = [
    'deploy', 'update', 'fix', 'merge', 'review', 'check', 'respond', 'reply',
    'message', 'send', 'create', 'add', 'remove', 'delete', 'test', 'verify',
    'approve', 'reject', 'assign', 'move', 'change', 'modify', 'implement',
    'schedule', 'remind', 'follow', 'ping', 'notify', 'confirm', 'complete',
    'submit', 'push', 'pull', 'release', 'rollback', 'investigate', 'debug',
    'analyze', 'prepare', 'setup', 'configure', 'document', 'write', 'read',
    'escalate', 'resolve', 'close', 'reopen', 'prioritize', 'discuss', 'meet',
    'attend', 'join', 'participate', 'coordinate', 'collaborate', 'share',
    'upload', 'download', 'install', 'uninstall', 'run', 'execute', 'build',
    'compile', 'refactor', 'migrate', 'backup', 'restore', 'monitor', 'track',
]

# Indicators that make a message actionable for the user
ACTION_INDICATORS = [
    'can you', 'could you', 'would you', 'please', 'need to', 'should', 'must',
    'have to', 'required', 'urgent', 'asap', 'priority', 'deadline', 'by eod',
    'by end of', 'before', 'action required', 'action needed', 'your turn',
    'waiting on you', 'blocked on', 'depends on you', 'assigned to you',
    '@', 'sujay', 'suji',  # User mentions
]


class TaskValidator:
    """Validates and filters tasks to ensure quality - STRICT MODE."""

    @staticmethod
    def is_noise(text: str) -> bool:
        """Check if text is noise/garbage that shouldn't be a task."""
        if not text:
            return True

        text_stripped = text.strip()
        text_lower = text_stripped.lower()

        # Check against noise patterns
        for pattern in NOISE_PATTERNS:
            if re.match(pattern, text_stripped, re.IGNORECASE):
                return True

        # Check non-actionable patterns
        for pattern in NON_ACTIONABLE_PATTERNS:
            if re.match(pattern, text_lower, re.IGNORECASE):
                return True

        # Too short (character count)
        if len(text_stripped) < MIN_TASK_LENGTH:
            return True

        # Too few words
        words = text_stripped.split()
        if len(words) < MIN_WORD_COUNT:
            return True

        # Check if it's mostly special characters
        alpha_count = sum(1 for c in text_stripped if c.isalpha())
        if alpha_count < len(text_stripped) * 0.4:  # Less than 40% alphabetic
            return True

        return False

    @staticmethod
    def is_filename(text: str) -> bool:
        """Check if text is a filename."""
        # Common file extensions
        file_pattern = r'.*\.(mp4|mp3|pdf|doc|docx|xls|xlsx|ppt|pptx|png|jpg|jpeg|gif|zip|rar|txt|csv|json|xml|html|css|js|ts|py|java|cpp|c|h|md|yml|yaml)$'
        return bool(re.match(file_pattern, text.strip(), re.IGNORECASE))

    @staticmethod
    def is_url_only(text: str) -> bool:
        """Check if text is just a URL without context."""
        text = text.strip()
        # Check if entire text is just a URL
        url_pattern = r'^https?://\S+$'
        return bool(re.match(url_pattern, text))

    @staticmethod
    def has_action_verb(text: str) -> bool:
        """Check if the text contains an action verb."""
        text_lower = text.lower()
        # Check for action verbs as whole words
        for verb in ACTION_VERBS:
            if re.search(rf'\b{verb}\b', text_lower):
                return True
        return False

    @staticmethod
    def has_action_indicator(text: str) -> bool:
        """Check if text has indicators that make it actionable."""
        text_lower = text.lower()
        for indicator in ACTION_INDICATORS:
            if indicator in text_lower:
                return True
        return False

    @staticmethod
    def is_meaningful_task(task_text: str, original_text: str = "") -> bool:
        """
        Determine if a task is meaningful and actionable.
        Returns True only if the task passes ALL validation checks.
        VERY STRICT - err on the side of filtering out.
        """
        if not task_text:
            return False

        # Run all noise checks
        if TaskValidator.is_noise(task_text):
            return False

        # Check for filenames
        if TaskValidator.is_filename(task_text):
            return False

        # Check for URL-only
        if TaskValidator.is_url_only(task_text):
            return False

        # Must have some action or be clearly actionable
        has_action = TaskValidator.has_action_verb(task_text)
        has_indicator = TaskValidator.has_action_indicator(task_text)

        if not has_action and not has_indicator:
            return False

        # Bare Jira tickets without context are not valid
        if re.match(r'^[A-Z]+-\d+\s*$', task_text.strip()):
            return False

        # Jira ticket with minimal context should still pass
        # e.g., "Review CLPB-1234" is valid but "CLPB-1234" alone is not

        return True

    @staticmethod
    def clean_task_text(text: str) -> str:
        """Clean up task text by removing formatting artifacts."""
        if not text:
            return ""

        # Remove leading/trailing punctuation and whitespace
        text = re.sub(r'^[\s\-\•\*\→\)\(\[\]]+', '', text)
        text = re.sub(r'[\s\-\•\*\→\)\(\[\]]+$', '', text)

        # Remove duplicate whitespace
        text = re.sub(r'\s+', ' ', text)

        # Remove leading numbers with periods/brackets (list formatting)
        text = re.sub(r'^\d+[\.\)\]]\s*', '', text)

        return text.strip()

    @staticmethod
    def extract_jira_tickets(text: str) -> List[str]:
        """Extract Jira ticket IDs from text."""
        pattern = r'\b([A-Z]{2,10}-\d+)\b'
        return re.findall(pattern, text)


class AIService:
    """AI-powered task analysis service using Google Gemini."""

    @classmethod
    async def analyze_tasks(cls, tasks_text: list[str]) -> list[dict]:
        """
        Analyze multiple tasks and return classification, time, dependencies, and REWRITTEN text.
        Uses strict validation to filter out meaningless tasks.
        EVERY valid task MUST be rewritten into a clear, professional sentence.
        """
        if not tasks_text:
            return []

        # Pre-filter obvious noise (but keep original indices for mapping)
        filtered_tasks = []
        original_indices = []
        for i, task in enumerate(tasks_text):
            cleaned = TaskValidator.clean_task_text(task)
            if TaskValidator.is_meaningful_task(cleaned, task):
                filtered_tasks.append(cleaned)
                original_indices.append(i)
            else:
                print(f"[PRE-FILTER] Skipping noise: '{task[:50]}...'")

        if not filtered_tasks:
            return [{
                "category": "other",
                "time": None,
                "depends_on_indices": [],
                "is_valid": False,
                "reason": "No meaningful tasks found"
            } for _ in tasks_text]

        # Build numbered task list for the prompt
        numbered_tasks = "\n".join([f"{i+1}. {task}" for i, task in enumerate(filtered_tasks)])

        prompt = f"""You are a SENIOR NLP ENGINEER. Analyze these tasks and for each valid one, REWRITE it into a clear, professional sentence.

TASKS TO ANALYZE:
{numbered_tasks}

═══════════════════════════════════════════════════════
STRICT VALIDATION - A task is INVALID if:
═══════════════════════════════════════════════════════
1. Less than 15 characters or 3 words of meaningful content
2. No clear action verb (deploy, review, update, message, fix, check, etc.)
3. Just a ticket number without context (e.g., "CLPB-1903" alone)
4. Noise: "etc", "ok", ")", filenames, bare URLs, greetings
5. Status update without required action
6. Non-actionable information (FYI, "here is", etc.)

═══════════════════════════════════════════════════════
MANDATORY REWRITING FOR VALID TASKS:
═══════════════════════════════════════════════════════
You MUST provide improved_text for EVERY valid task:
- Complete, grammatically correct sentence
- Clear action verb at start when possible
- Professional and specific
- Minimum 15 characters

Examples:
Input: "check PR and merge"
improved_text: "Review the pull request and complete the merge to the main branch."

Input: "CLPB-1903 status"
improved_text: "Update the status on Jira ticket CLPB-1903 with current progress."

Input: "ping John about deploy"
improved_text: "Message John regarding the deployment status and next steps."

═══════════════════════════════════════════════════════
FOR EACH TASK RETURN:
═══════════════════════════════════════════════════════
1. category: "deploy" | "message" | "jira_update" | "reminder" | "email" | "other"
   - deploy: PR, merge, release, production, rollback
   - message: Slack, DM, ping, reply, respond, follow up with person
   - jira_update: Jira ticket with ACTION required
   - reminder: Tasks with specific times/dates/deadlines
   - email: Formal email communication
   - other: Any other actionable task

2. time: Extract time/date ("2pm", "tomorrow", "4:30 PM"). null if none.

3. depends_on_indices: Array of task numbers (1-indexed) this depends on.

4. is_valid: true ONLY if task is meaningful and actionable

5. improved_text: REQUIRED for valid tasks - the REWRITTEN clear version

6. priority: "high" (urgent/ASAP) | "medium" (normal) | "low" (backlog)

7. reason: For invalid tasks, explain why

Return ONLY valid JSON array:
[
  {{"category": "deploy", "time": null, "depends_on_indices": [], "is_valid": true, "improved_text": "Review the pull request and deploy the update to production.", "priority": "medium"}},
  {{"category": "other", "time": null, "depends_on_indices": [], "is_valid": false, "reason": "Filename, not a task"}}
]"""

        try:
            response = model.generate_content(prompt)
            response_text = response.text.strip()

            # Clean up markdown code blocks
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])

            ai_results = json.loads(response_text)

            # Map back to original indices and fill in gaps
            result = []
            ai_result_idx = 0
            for i, task in enumerate(tasks_text):
                if i in original_indices:
                    if ai_result_idx < len(ai_results):
                        ai_result = ai_results[ai_result_idx]

                        # Additional validation on improved_text
                        if ai_result.get('is_valid', False):
                            improved = ai_result.get('improved_text', '')
                            if improved and TaskValidator.is_meaningful_task(improved, task):
                                result.append(ai_result)
                            else:
                                # If improved text fails validation, mark as invalid
                                ai_result['is_valid'] = False
                                ai_result['reason'] = 'Improved text failed validation'
                                result.append(ai_result)
                        else:
                            result.append(ai_result)

                        ai_result_idx += 1
                    else:
                        result.append({
                            "category": "other",
                            "time": None,
                            "depends_on_indices": [],
                            "is_valid": False,
                            "reason": "AI did not return result"
                        })
                else:
                    result.append({
                        "category": "other",
                        "time": None,
                        "depends_on_indices": [],
                        "is_valid": False,
                        "reason": "Filtered as noise in pre-processing"
                    })

            print(f"[AI] Analysis complete: {sum(1 for r in result if r.get('is_valid', False))} valid out of {len(result)}")
            return result

        except Exception as e:
            print(f"[AI] Error analyzing tasks: {e}")
            return [{
                "category": "other",
                "time": None,
                "depends_on_indices": [],
                "is_valid": False,
                "reason": f"AI analysis error: {str(e)}"
            } for _ in tasks_text]

    @classmethod
    async def suggest_message(cls, task_text: str) -> str:
        """Generate a suggested short message/DM for a task."""
        prompt = f"""Generate a short, friendly Slack/Teams message for this task.
Keep it casual, professional, and under 100 words.

Task: {task_text}

Return ONLY the message text, no quotes or explanation."""

        try:
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"[AI] Error generating message: {e}")
            return f"Hey! Quick note about: {task_text[:50]}..."

    @classmethod
    async def suggest_email(cls, task_text: str) -> tuple[str, str]:
        """Generate a suggested email subject and body."""
        prompt = f"""Generate a professional email for this task.

Task: {task_text}

Return a JSON object with "subject" and "body" fields.
The body should be professional but not overly formal.
Include placeholders like [Name] or [Details] where appropriate.

Return ONLY valid JSON, no other text. Example:
{{"subject": "Subject here", "body": "Email body here"}}"""

        try:
            response = model.generate_content(prompt)
            response_text = response.text.strip()

            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])

            result = json.loads(response_text)
            return result.get("subject", "Regarding your request"), result.get("body", "")
        except Exception as e:
            print(f"[AI] Error generating email: {e}")
            return f"Regarding: {task_text[:40]}", f"Hi,\n\nI'm reaching out about: {task_text}\n\nBest regards"

    @classmethod
    async def suggest_deploy_checklist(cls, task_text: str) -> list[str]:
        """Generate a deployment checklist based on the task."""
        prompt = f"""Generate a deployment checklist for this task.

Task: {task_text}

Create a practical, ordered checklist of 8-12 items covering:
- Pre-deployment checks
- Deployment steps
- Post-deployment verification

Return ONLY a JSON array of strings, no other text. Example:
["Step 1", "Step 2", "Step 3"]"""

        try:
            response = model.generate_content(prompt)
            response_text = response.text.strip()

            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])

            result = json.loads(response_text)
            return result if isinstance(result, list) else []
        except Exception as e:
            print(f"[AI] Error generating checklist: {e}")
            return [
                "Review and test all changes locally",
                "Run full test suite",
                "Create deployment tag",
                "Deploy to staging",
                "Verify staging deployment",
                "Deploy to production",
                "Monitor logs and metrics",
                "Notify team of completion"
            ]

    @classmethod
    async def analyze_messages(cls, raw_text: str, user_profile: dict) -> dict:
        """
        Intelligently analyze messy messages and extract ONLY meaningful, actionable tasks.
        EVERY task MUST be rewritten by AI into a clear, professional sentence.
        Groups related messages into cohesive tasks.
        Uses strict validation to prevent garbage tasks.
        """
        user_names = [user_profile.get('name', '')] + user_profile.get('nicknames', [])
        team_members = user_profile.get('teamMembers', [])
        reports_to = user_profile.get('reportsTo', [])
        tone = user_profile.get('tonePreference', 'friendly')

        # Build team context
        team_context = ""
        if team_members:
            team_names = [m.get('name', '') for m in team_members]
            team_context = f"\nTeam members: {', '.join(team_names)}"
        if reports_to:
            team_context += f"\nReports to: {', '.join(reports_to)}"

        prompt = f"""You are a SENIOR NLP ENGINEER specializing in task extraction. Your CRITICAL job is to:
1. Extract ONLY meaningful, actionable tasks relevant to the user
2. REWRITE every task into a clear, professional, action-oriented sentence
3. GROUP related messages into single cohesive tasks
4. NEVER output raw/messy text - always rewrite

USER CONTEXT:
User's names/nicknames: {', '.join(user_names) if user_names else 'Sujay, Suji'}
Tone preference: {tone}{team_context}

MESSAGE TO ANALYZE:
\"\"\"
{raw_text}
\"\"\"

═══════════════════════════════════════════════════════
CRITICAL RULES - WHAT TO IGNORE (NEVER CREATE TASKS FOR):
═══════════════════════════════════════════════════════
1. Filenames: "Costpoint+Automation.mp4", "document.pdf" → IGNORE
2. Meeting links without context: "Meeting Link", URLs alone → IGNORE
3. Fragments: "etc", ")", ".", single words, partial text → IGNORE
4. Bare Jira tickets: "CLPB-1903" alone without action context → IGNORE
5. Greetings/thanks: "Hi everyone", "Thanks!", "Good morning" → IGNORE
6. Status updates without action: "Deployment completed", "FYI" → IGNORE
7. Non-actionable information: "Here is the link", "See attached" → IGNORE
8. Short/vague text: Anything under 15 characters or 3 words → IGNORE

═══════════════════════════════════════════════════════
WHEN TO CREATE A TASK (must meet AT LEAST ONE):
═══════════════════════════════════════════════════════
1. User is DIRECTLY asked to do something ("can you", "please", "@Sujay")
2. User's name/nickname is mentioned with an action
3. Jira ticket requires ACTION (review, update, resolve, comment)
4. Deployment/PR action required (merge, review PR, deploy)
5. Response/reply needed to someone
6. Meeting with action items to prepare
7. Follow-up or reminder with clear action

═══════════════════════════════════════════════════════
MANDATORY TASK REWRITING RULES:
═══════════════════════════════════════════════════════
EVERY task text MUST be:
- A complete, grammatically correct sentence
- Clear and specific about what action is needed
- Professional and action-oriented
- Minimum 15 characters, minimum 3 words
- Start with an action verb when possible

REWRITING EXAMPLES:
❌ Raw: "check this PR and merge + deploy"
✅ Rewrite: "Review the pull request, complete the merge, and deploy the update to production."

❌ Raw: "CLPB-1903"
✅ DO NOT CREATE - bare ticket without action

❌ Raw: "CLPB-1903 needs review"
✅ Rewrite: "Review and provide feedback on Jira ticket CLPB-1903."

❌ Raw: "can everyone review the demo video"
✅ Rewrite: "Review the demo video and prepare feedback for discussion."

❌ Raw: "let's connect at 4:30"
✅ Rewrite: "Attend the meeting scheduled for 4:30 PM to discuss next steps."

❌ Raw: "Costpoint+Automation.mp4"
✅ DO NOT CREATE - filename is not a task

❌ Raw: "Meeting Link"
✅ DO NOT CREATE - no actionable context

═══════════════════════════════════════════════════════
GROUP RELATED MESSAGES INTO ONE TASK:
═══════════════════════════════════════════════════════
If multiple lines relate to the same topic, combine them:

Input:
"Review the demo
Understand Playwright automation
Let's connect after
Add team to chat"

Output: ONE task with text:
"Review the Costpoint automation demo, understand the Playwright implementation, and prepare for the follow-up discussion. Add required team members to the chat."

═══════════════════════════════════════════════════════
CATEGORIES (intelligent classification):
═══════════════════════════════════════════════════════
- message: Reply to someone, respond to DM, follow up with person
- jira_update: Jira ticket action (review, update, comment, resolve)
- deploy: PR review, merge, deploy, release, rollback
- reminder: Task with specific time/date/deadline
- email: Formal email communication
- other: Any other actionable task

PRIORITY:
- high: urgent, ASAP, critical, blocking, today, immediately
- medium: normal priority, this week, no urgency
- low: whenever, backlog, nice-to-have

═══════════════════════════════════════════════════════
OUTPUT FORMAT (strict JSON):
═══════════════════════════════════════════════════════
{{
  "relevant_to_user": true/false,
  "summary": "Brief 1-2 sentence summary of actionable items found",
  "improved_messages": [
    {{
      "original": "Original messy text from input",
      "improved": "Clean, {tone} professional rewrite of the message",
      "category": "message"
    }}
  ],
  "tasks": [
    {{
      "text": "REWRITTEN clear, actionable task (15+ chars, action verb, complete sentence)",
      "original_text": "The original raw text this came from",
      "category": "deploy|message|jira_update|reminder|email|other",
      "assigned_to": "Sujay",
      "due_date": "extracted date/time or null",
      "priority": "high|medium|low",
      "is_valid": true,
      "jira_ticket": "TICKET-123 or null"
    }}
  ]
}}

═══════════════════════════════════════════════════════
FINAL CHECKS BEFORE OUTPUT:
═══════════════════════════════════════════════════════
□ Is each task text a COMPLETE, REWRITTEN sentence? (not raw input)
□ Does each task have an action verb?
□ Is each task at least 15 characters and 3 words?
□ Is each task actually actionable by the user?
□ Are related items grouped into single tasks?
□ Were filenames, links, and fragments filtered out?

If NO meaningful tasks found, return empty tasks array. NEVER fabricate tasks."""

        try:
            response = model.generate_content(prompt)
            response_text = response.text.strip()

            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])

            result = json.loads(response_text)

            # Post-process: strict validation and filtering
            if 'tasks' in result:
                valid_tasks = []
                for task in result['tasks']:
                    task_text = task.get('text', '')

                    # Skip if AI marked as invalid
                    if not task.get('is_valid', True):
                        print(f"[FILTER] AI marked as invalid: '{task_text[:50]}...'")
                        continue

                    # Skip if fails our validation
                    if not TaskValidator.is_meaningful_task(task_text, task.get('original_text', '')):
                        print(f"[FILTER] Failed validation: '{task_text[:50]}...'")
                        continue

                    # Clean up the task text
                    task['text'] = TaskValidator.clean_task_text(task_text)

                    # Ensure task is marked valid
                    task['is_valid'] = True
                    valid_tasks.append(task)

                result['tasks'] = valid_tasks
                print(f"[AI] Extracted {len(valid_tasks)} valid tasks from message")

            return result

        except Exception as e:
            print(f"[AI] Error analyzing messages: {e}")
            return {
                "relevant_to_user": True,
                "summary": "Unable to analyze message. Please try again.",
                "improved_messages": [],
                "tasks": []
            }

    @classmethod
    async def reanalyze_tasks(cls, tasks: list[dict], original_messages: list[str] = None) -> list[dict]:
        """
        Re-analyze existing tasks to improve their quality.
        Takes existing tasks and returns improved versions with better wording,
        corrected categories, and removes any that are actually noise.
        EVERY valid task MUST be rewritten into a clear, professional sentence.
        """
        if not tasks:
            return []

        # Build task list for analysis
        task_descriptions = []
        for i, task in enumerate(tasks):
            desc = f"{i+1}. Text: \"{task.get('clean_text', task.get('text', ''))}\""
            if task.get('raw_text'):
                desc += f"\n   Original: \"{task.get('raw_text', '')}\""
            desc += f"\n   Category: {task.get('category', 'unknown')}"
            desc += f"\n   ID: {task.get('id', 'unknown')}"
            task_descriptions.append(desc)

        prompt = f"""You are a SENIOR NLP ENGINEER. Review these existing tasks and IMPROVE them.
Your goal is to make every task a clear, professional, actionable sentence.

CURRENT TASKS:
{chr(10).join(task_descriptions)}

═══════════════════════════════════════════════════════
YOUR JOB - IN ORDER OF PRIORITY:
═══════════════════════════════════════════════════════
1. REMOVE tasks that are:
   - Noise (filenames, bare URLs, "etc", ")", fragments)
   - Too short (< 15 chars or < 3 words)
   - No action verb
   - Bare Jira tickets without action context
   - Non-actionable (status updates, FYI, greetings)

2. REWRITE every valid task to be:
   - A complete, grammatically correct sentence
   - Clear about what action is needed
   - Professional and specific
   - Starting with an action verb when possible

3. CORRECT category if misclassified:
   - deploy: PR, merge, release, production
   - message: Reply to person, DM, follow up
   - jira_update: Jira ticket with ACTION needed
   - reminder: Has specific time/date
   - email: Formal email
   - other: Other actionable tasks

4. ADD context where missing (especially for Jira tickets)

═══════════════════════════════════════════════════════
REWRITING EXAMPLES:
═══════════════════════════════════════════════════════
❌ Old: "check PR"
✅ New: "Review the pull request and provide feedback before merging."

❌ Old: "CLPB-1903"
✅ Remove - bare ticket number

❌ Old: "update jira with status"
✅ New: "Update the Jira ticket with current progress and status details."

❌ Old: "ping John"
✅ New: "Message John to follow up on the pending action items."

═══════════════════════════════════════════════════════
OUTPUT FORMAT:
═══════════════════════════════════════════════════════
For each task, return:
{{
  "original_index": 0,
  "id": "task_id_from_input",
  "is_valid": true/false,
  "improved_text": "REWRITTEN clear, professional sentence (15+ chars, action verb)",
  "category": "correct category",
  "reason": "Why removed (if is_valid=false)"
}}

Return JSON array:
[
  {{"original_index": 0, "id": "1", "is_valid": true, "improved_text": "Review the pull request for the payment service and approve if ready for merge.", "category": "deploy"}},
  {{"original_index": 1, "id": "2", "is_valid": false, "improved_text": null, "category": null, "reason": "Filename - not actionable"}}
]

IMPORTANT: For valid tasks, improved_text is MANDATORY and must be a complete rewritten sentence."""

        try:
            response = model.generate_content(prompt)
            response_text = response.text.strip()

            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])

            improvements = json.loads(response_text)

            # Apply improvements to original tasks
            improved_tasks = []
            for improvement in improvements:
                idx = improvement.get('original_index', -1)
                if idx >= 0 and idx < len(tasks):
                    original_task = tasks[idx].copy()

                    if improvement.get('is_valid', False):
                        improved_text = improvement.get('improved_text', '')

                        # Validate the improved text
                        if improved_text and TaskValidator.is_meaningful_task(improved_text, original_task.get('raw_text', '')):
                            original_task['clean_text'] = improved_text
                            if improvement.get('category'):
                                original_task['category'] = improvement['category']
                            original_task['was_improved'] = True
                            original_task['is_valid'] = True
                            improved_tasks.append(original_task)
                        else:
                            # Improved text failed validation - mark as invalid
                            original_task['is_valid'] = False
                            original_task['reason'] = 'Improved text failed validation'
                            improved_tasks.append(original_task)
                    else:
                        # Task marked as invalid by AI
                        original_task['is_valid'] = False
                        original_task['reason'] = improvement.get('reason', 'Identified as noise')
                        improved_tasks.append(original_task)

            print(f"[REANALYZE] Processed {len(improved_tasks)} tasks, {sum(1 for t in improved_tasks if t.get('is_valid', False))} valid")
            return improved_tasks

        except Exception as e:
            print(f"[AI] Error reanalyzing tasks: {e}")
            # On error, return original tasks with validation applied
            for task in tasks:
                task['is_valid'] = TaskValidator.is_meaningful_task(
                    task.get('clean_text', task.get('text', '')),
                    task.get('raw_text', '')
                )
            return tasks

    @classmethod
    async def detect_dependencies(cls, tasks: list[dict]) -> list[list[int]]:
        """
        Analyze tasks and detect dependencies between them.
        Returns list of dependency lists (task IDs each task depends on).
        """
        if len(tasks) < 2:
            return [[] for _ in tasks]

        task_descriptions = "\n".join([
            f"{t['id']}: {t['text']}" for t in tasks
        ])

        prompt = f"""Analyze these tasks and detect dependencies between them.

Tasks:
{task_descriptions}

For each task, identify which other tasks it depends on (should happen after).
Look for:
- Explicit mentions ("after deploy", "once done", "when completed")
- Logical sequences (can't notify about deployment until deployed)
- Related topics that imply order

Return a JSON object where keys are task IDs and values are arrays of dependency task IDs.
Example: {{"2": [1], "3": [1, 2], "4": []}}

Return ONLY valid JSON, no other text."""

        try:
            response = model.generate_content(prompt)
            response_text = response.text.strip()

            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])

            result = json.loads(response_text)

            # Convert to list format matching task order
            dependencies = []
            for task in tasks:
                task_id = str(task['id'])
                deps = result.get(task_id, [])
                dependencies.append([int(d) for d in deps if str(d) != task_id])

            return dependencies
        except Exception as e:
            print(f"[AI] Error detecting dependencies: {e}")
            return [[] for _ in tasks]
