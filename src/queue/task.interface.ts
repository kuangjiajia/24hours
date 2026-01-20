import { LinearTask } from '../linear/linear.types';

export interface TaskJob {
  task: LinearTask;
  attempts: number;
}

export interface FeedbackJob {
  task: LinearTask;
  feedback: string;       // Merged user comment content
  commentIds: string[];   // Comment IDs to mark as processed
  sessionId: string;      // Previous session ID for context restoration
}

export interface RetryJob {
  task: LinearTask;
  sessionId: string;      // Previous session ID for context restoration
}

export interface TaskExecutionResult {
  success: boolean;
  error?: string;
  needsReview?: boolean;
  sessionId?: string;
}

export interface ProgressCallback {
  onProgress: (step: string, progress: number) => void;
  onSessionId?: (sessionId: string) => void;
}
