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

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tasks/parse` | Parse multiline text into tasks |
| GET | `/tasks` | Get all tasks |
| GET | `/tasks/{id}` | Get single task |
| DELETE | `/tasks/{id}` | Delete a task |
| POST | `/tasks/{id}/suggest/message` | Get suggested message |
| POST | `/tasks/{id}/suggest/email` | Get suggested email |
| POST | `/tasks/{id}/suggest/deploy-checklist` | Get deployment checklist |

### Reminders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tasks/{id}/reminders` | Create reminder for task |
| GET | `/reminders` | Get all reminders |
| GET | `/reminders/pending` | Get pending reminders |
| GET | `/notifications` | Get due notifications |
| DELETE | `/reminders/{id}` | Delete a reminder |

### Graph

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/graph` | Get task dependency graph |

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
