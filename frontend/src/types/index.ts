export interface Stats {
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
  failed: number;
}

export interface RunningTask {
  taskId: string;
  identifier: string;
  title: string;
  progress: number;
  currentStep?: string;
  startedAt: Date;
  duration: number;
  sessionId?: string;
}

export interface QueuedTask {
  id: string;
  taskId: string;
  identifier: string;
  title: string;
  priority: number;
  waitingTime: number;
}

export interface Log {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  taskId?: string;
  message: string;
}

export interface TaskUpdateEvent {
  taskId: string;
  identifier: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  currentStep?: string;
  startedAt?: Date;
  duration?: number;
  sessionId?: string;
}

export interface StatsEvent {
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
  failed: number;
  queueLength: number;
}

// Linear types
export interface LinearTask {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority?: number;
  createdAt: string;
  updatedAt?: string;
  labels?: LinearLabel[];
  assignee?: LinearUser;
  state?: LinearState;
  sessionId?: string;
}

export interface LinearUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface LinearComment {
  id: string;
  body: string;
  createdAt: string;
  user?: LinearUser;
}

export interface LinearState {
  id: string;
  name: string;
  type: string;
  color?: string;
}

export interface LinearLabel {
  id: string;
  name: string;
  color?: string;
}

export type StatusType = 'todo' | 'inProgress' | 'inReview' | 'done' | 'failed';

export const STATUS_MAP: Record<StatusType, string> = {
  todo: 'Todo',
  inProgress: 'In Progress',
  inReview: 'In Review',
  done: 'Done',
  failed: 'Failed',
};

export type PriorityType = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export const PRIORITY_MAP: Record<number, PriorityType> = {
  1: 'urgent',
  2: 'high',
  3: 'medium',
  4: 'low',
  0: 'none',
};

export const PRIORITY_LABELS: Record<PriorityType, string> = {
  urgent: 'URGENT',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
  none: 'NO PRIORITY',
};

export interface TaskWithDetails extends LinearTask {
  comments?: LinearComment[];
  progress?: number;
  logs?: Log[];
}

export type NavItem = 'dashboard' | 'tasks';

export type FilterStatus = 'all' | StatusType;

// Settings types
export interface Settings {
  // Model settings
  authMethod: 'api_key' | 'login';
  model: 'opus' | 'sonnet' | 'haiku';

  // Anthropic settings
  anthropicApiKey?: string;
  anthropicBaseUrl?: string;
  anthropicAuthToken?: string;

  // Linear settings
  linearApiKey?: string;
  linearTeamId?: string;
  linearWorkspace?: string;

  // Workspace settings
  workspacePath?: string;
}

export type AuthMethod = Settings['authMethod'];
export type ModelType = Settings['model'];
