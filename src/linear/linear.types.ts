export interface LinearTask {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority?: number;
  createdAt: Date;
  updatedAt?: Date;
  state?: LinearState;
  assignee?: LinearUser;
  labels?: LinearLabel[];
}

export interface LinearState {
  id: string;
  name: string;
  type: string;
  color?: string;
}

export interface LinearUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface LinearLabel {
  id: string;
  name: string;
  color?: string;
}

export interface LinearComment {
  id: string;
  body: string;
  createdAt: Date;
  user?: LinearUser;
}

export enum TaskStatus {
  BACKLOG = 'Backlog',
  TODO = 'Todo',
  IN_PROGRESS = 'In Progress',
  IN_REVIEW = 'In Review',
  DONE = 'Done',
  FAILED = 'Failed',
  CANCELED = 'Canceled',
}
