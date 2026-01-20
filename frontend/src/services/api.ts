import type { LinearTask, LinearComment, LinearState, Stats, Log, Settings } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

export async function fetchDashboard(): Promise<{
  linear: Stats;
  runningTasks: Array<{
    taskId: string;
    identifier: string;
    title: string;
    progress: number;
    currentStep?: string;
    startedAt: Date;
    duration: number;
  }>;
}> {
  const response = await fetch(`${API_URL}/api/monitor/dashboard`);
  return response.json();
}

export async function fetchQueue() {
  const response = await fetch(`${API_URL}/api/monitor/queue`);
  return response.json();
}

export async function fetchTaskDetail(taskId: string) {
  const response = await fetch(`${API_URL}/api/monitor/tasks/${taskId}`);
  return response.json();
}

export async function fetchTaskSession(taskId: string): Promise<{ taskId: string; sessionId: string | null }> {
  const response = await fetch(`${API_URL}/api/monitor/tasks/${encodeURIComponent(taskId)}/session`);
  return response.json();
}

export async function fetchHistory() {
  const response = await fetch(`${API_URL}/api/monitor/history`);
  return response.json();
}

export async function fetchHealth() {
  const response = await fetch(`${API_URL}/api/monitor/health`);
  return response.json();
}

// Linear API calls
export async function fetchTasksByStatus(
  status: string,
): Promise<{ status: string; tasks: LinearTask[] }> {
  const response = await fetch(
    `${API_URL}/api/monitor/linear/tasks/${encodeURIComponent(status)}`,
  );
  return response.json();
}

export async function fetchAllTasks(): Promise<LinearTask[]> {
  const response = await fetch(`${API_URL}/api/monitor/linear/tasks`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.tasks || [];
}

export async function fetchIssueWithComments(
  issueId: string,
): Promise<{ issue: LinearTask; comments: LinearComment[] } | null> {
  const response = await fetch(
    `${API_URL}/api/monitor/linear/issues/${encodeURIComponent(issueId)}`,
  );
  if (!response.ok) return null;
  return response.json();
}

export async function fetchIssueComments(
  issueId: string,
): Promise<{ issueId: string; comments: LinearComment[] }> {
  const response = await fetch(
    `${API_URL}/api/monitor/linear/issues/${encodeURIComponent(issueId)}/comments`,
  );
  return response.json();
}

export async function fetchLinearStates(): Promise<LinearState[]> {
  const response = await fetch(`${API_URL}/api/monitor/linear/states`);
  return response.json();
}

export async function fetchTaskLogs(taskId: string): Promise<Log[]> {
  const response = await fetch(`${API_URL}/api/monitor/tasks/${taskId}/logs`);
  if (!response.ok) return [];
  return response.json();
}

export async function pauseExecution(): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/api/monitor/execution/pause`, {
    method: 'POST',
  });
  return response.json();
}

export async function resumeExecution(): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/api/monitor/execution/resume`, {
    method: 'POST',
  });
  return response.json();
}

export async function fetchExecutionStatus(): Promise<{ paused: boolean }> {
  const response = await fetch(`${API_URL}/api/monitor/execution/status`);
  return response.json();
}

export async function retryTask(taskId: string): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_URL}/api/monitor/tasks/${encodeURIComponent(taskId)}/retry`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to retry task');
  }
  return response.json();
}

// Settings API
export async function fetchSettings(): Promise<Settings> {
  const response = await fetch(`${API_URL}/api/settings`);
  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }
  return response.json();
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const response = await fetch(`${API_URL}/api/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to save settings');
  }
  return response.json();
}
