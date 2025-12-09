import axios from 'axios';
import type {
  Task,
  TaskParseResponse,
  MessageSuggestion,
  EmailSuggestion,
  DeployChecklist,
  Reminder,
  GraphResponse,
  TaskStatus,
  UserProfile,
  MessageAnalysisResult,
  ReanalyzeResponse,
  TeamsMentionsResponse,
  TeamsStatusResponse,
} from '../types';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const taskApi = {
  parse: async (text: string): Promise<TaskParseResponse> => {
    const response = await api.post<TaskParseResponse>('/tasks/parse', { text });
    return response.data;
  },

  getAll: async (): Promise<Task[]> => {
    const response = await api.get<Task[]>('/tasks');
    return response.data;
  },

  getById: async (id: number): Promise<Task> => {
    const response = await api.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },

  deleteAll: async (): Promise<{ deleted_count: number }> => {
    const response = await api.delete<{ deleted_count: number }>('/tasks');
    return response.data;
  },

  suggestMessage: async (id: number): Promise<MessageSuggestion> => {
    const response = await api.post<MessageSuggestion>(`/tasks/${id}/suggest/message`);
    return response.data;
  },

  suggestEmail: async (id: number): Promise<EmailSuggestion> => {
    const response = await api.post<EmailSuggestion>(`/tasks/${id}/suggest/email`);
    return response.data;
  },

  suggestDeployChecklist: async (id: number): Promise<DeployChecklist> => {
    const response = await api.post<DeployChecklist>(`/tasks/${id}/suggest/deploy-checklist`);
    return response.data;
  },

  updateStatus: async (id: number, status: TaskStatus): Promise<Task> => {
    const response = await api.patch<Task>(`/tasks/${id}/status`, { status });
    return response.data;
  },

  analyzeMessages: async (text: string, userProfile: UserProfile): Promise<MessageAnalysisResult> => {
    const response = await api.post<MessageAnalysisResult>('/tasks/analyze', {
      text,
      user_profile: userProfile,
    });
    return response.data;
  },

  reanalyze: async (taskIds?: number[]): Promise<ReanalyzeResponse> => {
    const response = await api.post<ReanalyzeResponse>('/tasks/reanalyze', {
      task_ids: taskIds || null,
    });
    return response.data;
  },
};

export const reminderApi = {
  create: async (taskId: number, remindAt: string): Promise<Reminder> => {
    const response = await api.post<Reminder>(`/tasks/${taskId}/reminders`, {
      remind_at: remindAt,
    });
    return response.data;
  },

  getAll: async (): Promise<Reminder[]> => {
    const response = await api.get<Reminder[]>('/reminders');
    return response.data;
  },

  getPending: async (): Promise<Reminder[]> => {
    const response = await api.get<Reminder[]>('/reminders/pending');
    return response.data;
  },

  getNotifications: async (): Promise<Reminder[]> => {
    const response = await api.get<Reminder[]>('/notifications');
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/reminders/${id}`);
  },
};

export const graphApi = {
  get: async (): Promise<GraphResponse> => {
    const response = await api.get<GraphResponse>('/graph');
    return response.data;
  },
};

export interface AuthUrlResponse {
  auth_url: string;
  state: string;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export const teamsApi = {
  getStatus: async (): Promise<TeamsStatusResponse> => {
    const response = await api.get<TeamsStatusResponse>('/teams/status');
    return response.data;
  },

  getMentions: async (limit: number = 5): Promise<TeamsMentionsResponse> => {
    const response = await api.get<TeamsMentionsResponse>('/teams/mentions', {
      params: { limit },
    });
    return response.data;
  },

  getAuthUrl: async (): Promise<AuthUrlResponse> => {
    const response = await api.get<AuthUrlResponse>('/teams/auth/url');
    return response.data;
  },

  exchangeToken: async (code: string, state: string): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/teams/auth/token', {
      code,
      state,
    });
    return response.data;
  },

  getUserMentions: async (
    accessToken: string,
    limit: number = 25,
    filters?: {
      users?: string[];
      groupChats?: string[];
      meetingChats?: string[];
      individualChats?: string[];
    }
  ): Promise<TeamsMentionsResponse> => {
    const params: any = { access_token: accessToken, limit };
    if (filters?.users && filters.users.length > 0) {
      params.users = filters.users.join(',');
    }
    if (filters?.groupChats && filters.groupChats.length > 0) {
      params.group_chats = filters.groupChats.join(',');
    }
    if (filters?.meetingChats && filters.meetingChats.length > 0) {
      params.meeting_chats = filters.meetingChats.join(',');
    }
    if (filters?.individualChats && filters.individualChats.length > 0) {
      params.individual_chats = filters.individualChats.join(',');
    }

    const response = await api.get<TeamsMentionsResponse>('/teams/mentions/user', {
      params,
    });
    return response.data;
  },

  getDemoMentions: async (
    limit: number = 25,
    filters?: {
      users?: string[];
      groupChats?: string[];
      meetingChats?: string[];
      individualChats?: string[];
    }
  ): Promise<TeamsMentionsResponse> => {
    const params: any = { limit };
    if (filters?.users && filters.users.length > 0) {
      params.users = filters.users.join(',');
    }
    if (filters?.groupChats && filters.groupChats.length > 0) {
      params.group_chats = filters.groupChats.join(',');
    }
    if (filters?.meetingChats && filters.meetingChats.length > 0) {
      params.meeting_chats = filters.meetingChats.join(',');
    }
    if (filters?.individualChats && filters.individualChats.length > 0) {
      params.individual_chats = filters.individualChats.join(',');
    }

    const response = await api.get<TeamsMentionsResponse>('/teams/mentions/demo', {
      params,
    });
    return response.data;
  },
};

export default api;
