# Demo Mode Guide - Test Without Admin Access

Since you don't have admin access to grant consent for the Teams integration, I've created a **Demo Mode** that lets you test the entire UI without any authentication.

## 🎯 What's Been Added

### Backend: New Demo Endpoint

**Endpoint**: `GET /teams/mentions/demo`

**Location**: [backend/app/routes/teams.py:297-338](backend/app/routes/teams.py#L297-L338)

**Features**:
- ✅ No authentication required
- ✅ Returns realistic fake Teams mentions
- ✅ Works immediately without any setup
- ✅ Perfect for UI development and testing

### Frontend: New API Method

**Method**: `teamsApi.getDemoMentions(limit)`

**Location**: [frontend/src/api/client.ts:167-172](frontend/src/api/client.ts#L167-L172)

## 📋 How to Use Demo Mode

### Option 1: Test via API Directly

Open your browser and visit:
```
http://localhost:8000/teams/mentions/demo?limit=5
```

You'll see JSON response with mock data like:
```json
{
  "mentions": [
    {
      "id": "mock-1",
      "message_text": "@You Hey, can you review the PR for the authentication module?",
      "sender_name": "Sarah Chen",
      "sender_email": "sarah.chen@company.com",
      "chat_name": "Dev Team",
      "timestamp": "2025-12-09T...",
      "is_from_channel": false
    },
    ...
  ],
  "count": 5,
  "is_mock_data": true,
  "message": "Using demo data - no authentication required. Configure Graph API for real data."
}
```

### Option 2: Test via Frontend (Console)

1. Open your frontend: http://localhost:5173
2. Open browser DevTools (F12)
3. Go to Console tab
4. Run:

```javascript
// Import the API
import { teamsApi } from './src/api/client';

// Fetch demo mentions
const demoData = await teamsApi.getDemoMentions(5);
console.log(demoData);
```

### Option 3: Modify TeamsMentionsModal (Recommended)

Update the modal to add a "Use Demo Data" button. Here's how:

**File**: `frontend/src/components/TeamsMentionsModal.tsx`

Add this button in the modal header (around line 250):

```tsx
<div className="teams-modal-header">
  <div className="teams-modal-title">
    <MessageSquare size={20} />
    <h3>Teams Mentions</h3>
    {isMockData && <span className="demo-badge">Demo Data</span>}
  </div>

  {/* ADD THIS DEMO BUTTON */}
  <motion.button
    className="demo-data-btn"
    onClick={loadDemoData}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    title="Load demo data without authentication"
  >
    <Sparkles size={16} />
    Demo Mode
  </motion.button>

  <motion.button
    className="close-btn"
    onClick={onClose}
    whileHover={{ scale: 1.1, rotate: 90 }}
    whileTap={{ scale: 0.9 }}
  >
    <X size={18} />
  </motion.button>
</div>
```

Then add the `loadDemoData` function:

```tsx
const loadDemoData = useCallback(async () => {
  setLoading(true);
  setError(null);
  setProcessSuccess(false);

  try {
    const response: TeamsMentionsResponse = await teamsApi.getDemoMentions(5);
    setMentions(response.mentions);
    setIsMockData(true);
    setMockMessage(response.message || 'Demo data loaded');
    // Select all by default
    setSelectedMentions(new Set(response.mentions.map((m) => m.id)));
  } catch (err) {
    console.error('Failed to load demo mentions:', err);
    setError('Failed to load demo data. Please try again.');
  } finally {
    setLoading(false);
  }
}, []);
```

## 🎨 Mock Data Includes

The demo endpoint returns 5 realistic mentions:

1. **Sarah Chen** (Chat) - "Review the PR for authentication module"
2. **Mike Johnson** (Backend Team/General Channel) - "Update API documentation"
3. **Emily Davis** (Project Alpha Chat) - "Sprint planning meeting reminder"
4. **James Wilson** (DevOps/Deployments Channel) - "Database migration script failed"
5. **Lisa Park** (Marketing Collab Chat) - "Share presentation slides"

Each mention includes:
- ✅ Unique ID
- ✅ Sender name and email
- ✅ Message text with @mention
- ✅ Chat or Channel context
- ✅ Team name (for channels)
- ✅ Realistic timestamps (1 hour to 1 day ago)
- ✅ Channel vs Chat distinction

## 🔄 Complete Testing Flow

### 1. Start Servers
```bash
# Backend (already running)
cd backend && venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000

# Frontend (already running)
cd frontend && npm run dev
```

### 2. Open App
Navigate to: http://localhost:5173

### 3. Click "Teams Mentions" Button
In the dashboard header

### 4. Load Demo Data
Either:
- Wait for auto-fetch (will use demo if no auth)
- Click "Demo Mode" button (if you added it)
- Manually call `teamsApi.getDemoMentions()`

### 5. Test Full Workflow
1. **View Mentions** - See all 5 demo mentions
2. **Select/Deselect** - Toggle checkboxes
3. **Send to AI** - Process selected mentions through AI
4. **Create Tasks** - Convert to actionable tasks
5. **View in Dashboard** - See tasks in Kanban/List view

## 🎯 API Endpoints Comparison

| Endpoint | Auth Required | Returns Real Data | Use Case |
|----------|---------------|-------------------|----------|
| `/teams/mentions` | ❌ App-level | ⚠️ Needs admin consent | Production with app credentials |
| `/teams/mentions/user` | ✅ User OAuth token | ✅ Yes | Production with user auth |
| `/teams/mentions/demo` | ❌ None | ❌ Mock data | **Development/Testing** ⭐ |

## 🚀 Quick Test Script

Save this as `test-demo.html` in your project root:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Teams Demo Test</title>
    <style>
        body { font-family: Arial; padding: 20px; }
        button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
        #output { margin-top: 20px; white-space: pre-wrap; }
        .mention { border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .sender { font-weight: bold; color: #3b82f6; }
        .time { color: #888; font-size: 12px; }
        .channel { background: #fef3c7; padding: 2px 6px; border-radius: 3px; font-size: 11px; }
        .chat { background: #dbeafe; padding: 2px 6px; border-radius: 3px; font-size: 11px; }
    </style>
</head>
<body>
    <h1>Teams Mentions Demo</h1>
    <button onclick="loadDemoData()">Load Demo Mentions</button>
    <div id="output"></div>

    <script>
        async function loadDemoData() {
            const output = document.getElementById('output');
            output.innerHTML = '<p>Loading...</p>';

            try {
                const response = await fetch('http://localhost:8000/teams/mentions/demo?limit=5');
                const data = await response.json();

                output.innerHTML = `
                    <h2>Found ${data.count} mentions</h2>
                    <p style="color: orange;">${data.message}</p>
                    ${data.mentions.map(m => `
                        <div class="mention">
                            <div>
                                <span class="sender">${m.sender_name}</span>
                                ${m.is_from_channel
                                    ? `<span class="channel">📢 ${m.team_name}/${m.channel_name}</span>`
                                    : `<span class="chat">💬 ${m.chat_name || 'Direct Message'}</span>`
                                }
                                <span class="time">${new Date(m.timestamp).toLocaleString()}</span>
                            </div>
                            <p>${m.message_text}</p>
                        </div>
                    `).join('')}
                `;
            } catch (error) {
                output.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
            }
        }
    </script>
</body>
</html>
```

Then open `test-demo.html` in your browser and click the button!

## 🎭 Switching Between Real and Demo Data

When you eventually get admin consent, switching back is easy:

```typescript
// In TeamsMentionsModal.tsx

// Demo mode (current)
const response = await teamsApi.getDemoMentions(5);

// Real mode with OAuth (future)
const accessToken = localStorage.getItem('teams_access_token');
const response = await teamsApi.getUserMentions(accessToken, 5);

// Or app-level auth
const response = await teamsApi.getMentions(5);
```

## 📊 Testing Checklist

Use demo mode to test:

- [ ] Modal opens and displays mentions
- [ ] Checkbox selection works
- [ ] "Select All" / "Deselect All" buttons work
- [ ] Sending selected mentions to AI works
- [ ] AI extracts tasks correctly
- [ ] Tasks appear in dashboard
- [ ] Tasks can be moved between Kanban columns
- [ ] Tasks can be viewed in List/Graph views
- [ ] Tasks can be edited and deleted
- [ ] Reminders can be set on tasks
- [ ] Message suggestions work
- [ ] Email suggestions work
- [ ] Deploy checklists generate correctly

## 🔐 Security Note

The demo endpoint intentionally:
- ✅ Bypasses all authentication
- ✅ Returns the same fake data to everyone
- ✅ Cannot access real Teams data
- ✅ Is safe for development/testing

**In production**, you would:
1. Remove or disable the `/teams/mentions/demo` endpoint
2. Use only authenticated endpoints
3. Require proper OAuth consent

## 🎉 Benefits of Demo Mode

1. **No Admin Dependency** - Test immediately without waiting for IT
2. **Consistent Data** - Same test data every time
3. **Fast Iteration** - No OAuth flow delays
4. **UI Focus** - Perfect for frontend development
5. **Documentation** - Easy to show features to stakeholders
6. **CI/CD Friendly** - Can run in automated tests

## 📝 Next Steps

1. **Now**: Use demo mode for all UI testing
2. **Meanwhile**: Request admin consent from ByteRidge IT
3. **Later**: Switch to real OAuth when approved
4. **Production**: Disable demo endpoint

## 🆘 Troubleshooting

### Backend not responding?
Check if backend is running:
```bash
curl http://localhost:8000/teams/mentions/demo?limit=5
```

### Getting CORS errors?
The API should allow localhost, but if needed, add to backend's CORS config.

### Demo data not showing?
1. Check browser console for errors
2. Verify backend URL is correct (localhost:8000)
3. Ensure backend endpoint exists (check teams.py)

---

**You're now ready to develop and test the entire Teams integration UI without needing any admin access!** 🚀
