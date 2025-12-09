export type TaskCategory = 'deploy' | 'message' | 'email' | 'reminder' | 'other' | 'jira_update';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TaskPriority = 'high' | 'medium' | 'low';

export type ReminderStatus = 'pending' | 'sent';

export interface Reminder {
  id: number;
  task_id: number;
  remind_at: string;
  status: ReminderStatus;
  created_at: string;
  task_text?: string;
}

export interface ImprovementRecord {
  timestamp: string;
  old_text: string;
  new_text: string;
  reason?: string;
}

export interface Task {
  id: number;
  user_id: string;
  raw_text: string;
  clean_text: string;
  original_message?: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  jira_ticket?: string | null;
  assigned_to?: string | null;
  due_at: string | null;
  was_improved: boolean;
  improvement_history: ImprovementRecord[];
  created_at: string;
  updated_at: string;
  reminders: Reminder[];
  depends_on: number[];
}

export interface TaskParseResponse {
  tasks: Task[];
  count: number;
  filtered_count: number;
}

export interface MessageSuggestion {
  suggested_message: string;
}

export interface EmailSuggestion {
  subject: string;
  body: string;
}

export interface DeployChecklist {
  items: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  category: TaskCategory;
  time?: string | null;
  dependsOn: string[];
  raw_text?: string;
  original_message?: string | null;
  was_improved?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// For the new TaskGraph component
export interface TaskGraphData {
  id: string;
  text: string;
  category: 'message' | 'jira_update' | 'deploy' | 'reminder' | 'other' | 'email';
  time: string | null;
  dependsOn: string[];
  priority?: TaskPriority;
  isPinned?: boolean;
  // Additional fields for task detail modal
  raw_text?: string;
  original_message?: string | null;
  was_improved?: boolean;
}

// User Profile for intelligent message parsing
export type TonePreference = 'formal' | 'friendly' | 'concise' | 'detailed';

export interface TeamMember {
  name: string;
  nicknames: string[];
  role?: string;
}

export interface UserProfile {
  name: string;
  nicknames: string[];
  role: string;
  teamMembers: TeamMember[];
  reportsTo: string[];
  tonePreference: TonePreference;
}

// Message Analysis types
export interface ImprovedMessage {
  original: string;
  improved: string;
  category: TaskCategory;
}

export interface ExtractedTask {
  text: string;
  original_text?: string | null;
  category: string;
  assigned_to: string;
  due_date: string | null;
  priority: TaskPriority;
  is_valid: boolean;
  jira_ticket?: string | null;
}

export interface MessageAnalysisResult {
  improved_messages: ImprovedMessage[];
  tasks: ExtractedTask[];
  summary: string;
  relevant_to_user: boolean;
}

// Reanalyze types
export interface ReanalyzeResult {
  task_id: number;
  was_improved: boolean;
  old_text: string;
  new_text?: string | null;
  old_category: string;
  new_category?: string | null;
  was_removed: boolean;
  reason?: string | null;
}

export interface ReanalyzeResponse {
  improved_count: number;
  removed_count: number;
  unchanged_count: number;
  results: ReanalyzeResult[];
}

// Teams Integration types
export interface TeamsMention {
  id: string;
  message_text: string;
  sender_name: string;
  sender_email?: string | null;
  chat_name?: string | null;
  channel_name?: string | null;
  team_name?: string | null;
  timestamp: string;
  web_url?: string | null;
  is_from_channel: boolean;
  // New metadata fields
  chat_type?: string | null; // 'individual', 'group', 'meeting'
  chat_id?: string | null;
  requested_by?: string | null;
  requested_at?: string | null;
  graph_metadata?: Record<string, any> | null;
  // Status field
  status?: string | null; // 'Open', 'In Progress', 'Done'
}

export interface TeamsMentionsResponse {
  mentions: TeamsMention[];
  count: number;
  is_mock_data: boolean;
  message?: string | null;
}

export interface TeamsStatusResponse {
  is_configured: boolean;
  message: string;
}
