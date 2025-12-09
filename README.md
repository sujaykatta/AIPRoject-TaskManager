TaskFlow AI - Complete Feature Overview
Your application is a sophisticated AI-powered task management system that transforms messy, unstructured text into organized, actionable tasks. Here's what it can do:
🎯 Core Capabilities

1. AI-Powered Task Management
   Smart Text Parsing: Paste any messy task list and AI automatically parses it into individual, clean tasks
   Intelligent Cleaning: Uses Google Gemini 2.5 Flash to rewrite tasks professionally, fix grammar, and remove noise
   Auto-Categorization: Automatically classifies tasks into 6 categories:
   🚀 Deploy: PR merges, releases, production deployments
   💬 Message: Slack/Teams DMs, replies, follow-ups
   📧 Email: Formal email communication
   ⏰ Reminder: Time-based tasks with deadlines
   🎫 Jira Update: Ticket actions requiring updates
   📋 Other: General actionable tasks
   Priority Detection: Assigns High/Medium/Low priority based on urgency indicators
   Dependency Detection: Automatically identifies relationships between tasks
2. Microsoft Teams Integration
   OAuth Authentication: Secure Microsoft login
   @Mentions Fetching: Retrieves all messages where you're mentioned
   Multi-Source Support: 1:1 chats, group chats, meeting chats, team channels
   Advanced Filtering: Filter by senders, teams, channels, chat types
   Sortable: Sort mentions by creation date
   Batch Processing: Select multiple mentions and extract tasks with AI
   Demo Mode: Full-featured testing without authentication
3. Message Analyzer
   Messy Message Processing: Analyzes poorly formatted conversations or task lists
   Professional Rewriting: Converts casual/messy text into clear, actionable language
   Task Extraction: Pulls out actionable items from lengthy conversations
   Contextual Understanding: Uses your profile (name, team, role) for better analysis
   Relevance Filtering: Determines if content applies to you
4. Task Re-Analysis ("Improve" Feature)
   Quality Enhancement: Re-analyzes existing tasks to improve wording and categorization
   Noise Removal: Identifies and removes tasks that are actually garbage
   Batch Processing: Improve all tasks at once
   Results Summary: Shows improved count, removed count, unchanged count
   📊 Four Visualization Modes
5. Kanban Board (Default)
   Three columns: To Do, In Progress, Done
   Drag & drop to move tasks between columns
   Visual cards with category icons, priority indicators, AI improvement badges
   Status automatically saved
6. List View
   Compact scrollable list of all tasks
   Color-coded category badges
   Priority icons
   Sortable by creation date
   Click to view details
7. Dependency Graph
   Interactive graph visualization using React Flow
   Nodes colored by category
   Animated arrows showing task relationships
   Drag to rearrange, zoom, pan controls
   Minimap for navigation
   Filters out "Done" status tasks automatically
8. Flowchart & Tree View
   Flowchart Mode: Hierarchical flow diagram with smooth connections
   Tree View: Collapsible/expandable tree structure
   Parent-child relationships clearly shown
   Filters out "Done" status tasks automatically
   ⚙️ Advanced Features
   AI Suggestions
   For any task, get AI-generated:
   Message Suggestions: Casual chat/DM text
   Email Suggestions: Professional email with subject and body
   Deploy Checklists: 8-12 step deployment plans
   Smart Reminders
   Set date/time reminders for any task
   Notification system in header
   Background scheduler processes reminders automatically
   Visual reminder panel with upcoming alerts
   Task Details & Metadata
   Each task includes:
   Raw text (original input, never modified)
   Clean text (AI-improved version)
   Original message (full context from Teams)
   Category, Status, Priority
   Jira ticket linking
   Assigned to (person responsible)
   Due date (optional deadline)
   Dependencies (task relationships)
   Created Time (when added to system)
   Sent By (original sender from Teams)
   Added By (who added it to the system)
   Improvement history (full audit trail)
   Sorting & Filtering
   Sort by Created Date: Ascending/descending toggle
   Filter Teams mentions: By sender, team, channel, chat type
   Active filters work seamlessly with sorting
   Done items hidden from Graph and Visualize views
   🎨 Customization & Settings
   User Profile
   Display name with personalized greeting
   Multiple nicknames for better AI recognition
   Role and "Reports To" for team context
   Profile saves to localStorage
   Team Management
   Add team members with names, nicknames, roles
   AI uses team info for better task assignment
   Tone Preferences
   Choose AI writing style:
   Formal: Professional, structured
   Friendly: Warm, approachable
   Concise: Brief, to-the-point
   Detailed: Thorough explanations
   Visual Preferences
   Dark/Light Theme: Toggle with smooth animations
   Responsive design for all screen sizes
   Modern, clean UI with custom scrollbars
   🔧 Technical Highlights
   Intelligent Filtering
   40+ regex patterns to filter garbage content
   Action verb detection ensures tasks are actionable
   Minimum requirements: 15 characters, 3 words
   Duplicate prevention
   Context-aware relevance checking
   Real-Time Updates
   Tasks refresh across all views instantly
   Status changes sync automatically
   Dependency graph updates on changes
   Performance Optimizations
   Lazy loading components
   Memoization for expensive calculations
   Batch operations for multiple tasks
   Local storage caching
   🚀 Typical Workflows
   Quick Task Entry
   Click "Add Tasks" → Paste task list → AI analyzes
   Tasks appear categorized in Kanban board
   Drag to "In Progress" or "Done"
   Teams Integration
   Click "Teams" → Authenticate
   Select relevant @mentions
   AI extracts actionable tasks
   Tasks automatically added to dashboard
   Message Analysis
   Click "Analyze" → Paste messy message
   AI rewrites and extracts tasks
   Review and add to board
   Task Management
   View in preferred mode (Kanban/List/Graph/Tree)
   Click for details → Get AI suggestions
   Set reminders → Track dependencies
   Mark complete or delete
   ✨ What Makes It Unique
   AI-First: Every task processed and improved by AI
   Context-Aware: Uses full user/team profile for intelligent processing
   4 Visualization Modes: Multiple ways to view and organize
   Teams Integration: Direct Microsoft Teams connection
   Strict Quality Control: Aggressive filtering of noise
   Improvement Tracking: Complete audit trail of changes
   Demo Mode: Full testing without authentication
   Professional Rewriting: Converts casual text to polished tasks
   Dependency Intelligence: Automatic relationship detection
   Metadata Rich: Tracks created time, sent by, added by, and more

# TaskMap

A full-stack task management application that parses, classifies, and helps you manage tasks intelligently.

## Features

- **Task Parsing**: Paste a list of tasks and automatically parse them into individual items
- **Smart Classification**: Automatically categorize tasks as:
  - Deploy (deployment-related tasks)
  - Message (short chat/DM tasks)
  - Email (formal email tasks)
  - Reminder (time-based reminders)
  - Other
- **Smart Suggestions**:
  - Generate suggested DM/chat messages
  - Generate email subject and body
  - Generate deployment checklists
- **Dependency Graph**: Visualize task dependencies based on wording
- **Reminders**: Set reminders for any task with date/time picker
- **Background Scheduler**: Automatic reminder processing

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Python FastAPI
- **Database**: PostgreSQL
- **Graph Visualization**: React Flow
- **Scheduler**: APScheduler

## Project Structure

```
taskmap/
├── backend/
│   ├── app/
│   │   ├── core/           # Config and database setup
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routes/         # API endpoints
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── main.py         # FastAPI app entry
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── components/     # React components
│   │   ├── types/          # TypeScript types
│   │   └── App.tsx
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Getting Started

### Option 1: Using Docker (Recommended)

1. Make sure Docker and Docker Compose are installed
2. Run the entire stack:

```bash
docker-compose up --build
```

This will start:

- PostgreSQL on port 5432
- Backend API on http://localhost:8000
- Frontend on http://localhost:5173 (run separately)

For the frontend:

```bash
cd frontend
npm install
npm run dev
```

### Option 2: Manual Setup

#### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

#### Database Setup

Start PostgreSQL and create a database:

```sql
CREATE DATABASE taskmap;
CREATE USER taskmap WITH PASSWORD 'taskmap123';
GRANT ALL PRIVILEGES ON DATABASE taskmap TO taskmap;
```

Or use Docker for just the database:

```bash
docker run -d \
  --name taskmap-db \
  -e POSTGRES_USER=taskmap \
  -e POSTGRES_PASSWORD=taskmap123 \
  -e POSTGRES_DB=taskmap \
  -p 5432:5432 \
  postgres:15-alpine
```

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend runs at: http://localhost:5173

## API Endpoints

### Tasks

| Method | Endpoint                               | Description                     |
| ------ | -------------------------------------- | ------------------------------- |
| POST   | `/tasks/parse`                         | Parse multiline text into tasks |
| GET    | `/tasks`                               | Get all tasks                   |
| GET    | `/tasks/{id}`                          | Get single task                 |
| DELETE | `/tasks/{id}`                          | Delete a task                   |
| POST   | `/tasks/{id}/suggest/message`          | Get suggested message           |
| POST   | `/tasks/{id}/suggest/email`            | Get suggested email             |
| POST   | `/tasks/{id}/suggest/deploy-checklist` | Get deployment checklist        |

### Reminders

| Method | Endpoint                | Description              |
| ------ | ----------------------- | ------------------------ |
| POST   | `/tasks/{id}/reminders` | Create reminder for task |
| GET    | `/reminders`            | Get all reminders        |
| GET    | `/reminders/pending`    | Get pending reminders    |
| GET    | `/notifications`        | Get due notifications    |
| DELETE | `/reminders/{id}`       | Delete a reminder        |

### Graph

| Method | Endpoint | Description               |
| ------ | -------- | ------------------------- |
| GET    | `/graph` | Get task dependency graph |

## Usage

1. **Add Tasks**: Paste your task list in the text area (one task per line)
2. **Analyze**: Click "Analyze Tasks" to parse and classify
3. **View Dashboard**: See all tasks in list or graph view
4. **Task Details**: Click a task to see details and get suggestions
5. **Set Reminders**: Use the date/time picker to set reminders
6. **Monitor**: Check the reminder panel for due notifications

## Example Tasks

```
Deploy the new API to production
Message John about the project status
Email the client with the weekly report
Remind me to review PRs tomorrow at 10am
Update documentation after deploy
Ping the team on Slack about the release
Send deployment notification email to stakeholders
```

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://taskmap:taskmap123@localhost:5432/taskmap
```

## License

MIT
