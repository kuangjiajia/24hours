import { Injectable, Inject, forwardRef, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { MonitorGateway } from './monitor.gateway';
import { LinearService } from '../linear/linear.service';
import { TaskStatus } from '../linear/linear.types';
import { SessionStoreService } from './session-store.service';

export interface RunningTaskInfo {
  taskId: string;
  identifier: string;
  title: string;
  status: 'running';
  progress: number;
  currentStep?: string;
  steps: { step: string; timestamp: Date }[];
  startedAt: Date;
  sessionId?: string;
}

export interface TaskExecutionHistory {
  taskId: string;
  identifier: string;
  title: string;
  sessionId?: string;
  startedAt: Date;
  completedAt: Date;
  success: boolean;
}

@Injectable()
export class MonitorService {
  // Store currently running tasks
  private runningTasks: Map<string, RunningTaskInfo> = new Map();
  // Store completed task execution history (with sessionId)
  private taskHistory: Map<string, TaskExecutionHistory> = new Map();
  // Execution paused state
  private isPaused = false;

  constructor(
    private gateway: MonitorGateway,
    private linearService: LinearService,
    private sessionStore: SessionStoreService,
    private configService: ConfigService,
    @InjectQueue('task-queue') private taskQueue: Queue,
  ) {}

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    const [queueCounts, linearStats] = await Promise.all([
      this.taskQueue.getJobCounts(),
      this.getLinearStats(),
    ]);

    return {
      queue: {
        waiting: queueCounts.waiting,
        active: queueCounts.active,
        completed: queueCounts.completed,
        failed: queueCounts.failed,
      },
      linear: linearStats,
      runningTasks: Array.from(this.runningTasks.values()),
    };
  }

  /**
   * Get Linear task statistics
   */
  private async getLinearStats() {
    const [todo, inProgress, inReview, done, failed] = await Promise.all([
      this.linearService.getTasksByStatus(TaskStatus.TODO),
      this.linearService.getTasksByStatus(TaskStatus.IN_PROGRESS),
      this.linearService.getTasksByStatus(TaskStatus.IN_REVIEW),
      this.linearService.getTasksByStatus(TaskStatus.DONE),
      this.linearService.getTasksByStatus(TaskStatus.FAILED),
    ]);

    return {
      todo: todo.length,
      inProgress: inProgress.length,
      inReview: inReview.length,
      done: done.length,
      failed: failed.length,
    };
  }

  /**
   * Get queued tasks
   */
  async getQueuedTasks() {
    const jobs = await this.taskQueue.getJobs(['waiting', 'delayed']);
    return jobs.map((job) => ({
      id: job.id,
      taskId: job.data.id,
      identifier: job.data.identifier,
      title: job.data.title,
      priority: job.data.priority,
      waitingTime: Date.now() - job.timestamp,
      attempts: job.attemptsMade,
    }));
  }

  /**
   * Get task detail
   */
  async getTaskDetail(taskId: string) {
    // First check running tasks
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask) {
      return {
        ...runningTask,
        duration: Date.now() - runningTask.startedAt.getTime(),
      };
    }

    // Then check task history for completed tasks (in memory)
    const historyTask = this.taskHistory.get(taskId);
    if (historyTask) {
      return {
        ...historyTask,
        status: historyTask.success ? 'completed' : 'failed',
        duration: historyTask.completedAt.getTime() - historyTask.startedAt.getTime(),
      };
    }

    // Finally check SQLite for persisted sessions
    const storedSession = this.sessionStore.getSessionByTaskId(taskId);
    if (storedSession) {
      return {
        taskId: storedSession.linearTaskId,
        identifier: storedSession.identifier,
        title: storedSession.title,
        sessionId: storedSession.sessionId,
        startedAt: new Date(storedSession.startedAt),
        completedAt: storedSession.completedAt ? new Date(storedSession.completedAt) : undefined,
        status: storedSession.completedAt
          ? (storedSession.success ? 'completed' : 'failed')
          : 'unknown',
        success: storedSession.success,
      };
    }

    return null;
  }

  /**
   * Get session ID for a task (from SQLite)
   */
  getTaskSessionId(taskId: string): string | null {
    // First check running tasks
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask?.sessionId) {
      return runningTask.sessionId;
    }

    // Then check SQLite
    const storedSession = this.sessionStore.getSessionByTaskId(taskId);
    return storedSession?.sessionId || null;
  }

  /**
   * Get task history (completed/failed)
   */
  async getTaskHistory() {
    const [done, failed] = await Promise.all([
      this.linearService.getTasksByStatus(TaskStatus.DONE),
      this.linearService.getTasksByStatus(TaskStatus.FAILED),
    ]);

    return [...done, ...failed]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 50); // Last 50 tasks
  }

  /**
   * Record task start
   */
  taskStarted(taskId: string, identifier: string, title: string) {
    const info: RunningTaskInfo = {
      taskId,
      identifier,
      title,
      status: 'running',
      progress: 0,
      steps: [],
      startedAt: new Date(),
    };

    this.runningTasks.set(taskId, info);

    // Persist to SQLite
    this.sessionStore.saveSession({
      linearTaskId: taskId,
      sessionId: '',
      identifier,
      title,
      startedAt: info.startedAt.toISOString(),
    });

    this.gateway.broadcastTaskUpdate({
      taskId,
      identifier,
      status: 'running',
      startedAt: info.startedAt,
    });

    this.gateway.broadcastLog({
      timestamp: new Date(),
      level: 'info',
      taskId,
      message: `🚀 [${identifier}] Starting task: ${title}`,
    });
  }

  /**
   * Update task progress
   */
  taskProgress(taskId: string, step: string, progress: number) {
    const info = this.runningTasks.get(taskId);
    if (info) {
      info.progress = progress;
      info.currentStep = step;
      info.steps.push({
        step,
        timestamp: new Date(),
      });

      this.gateway.broadcastTaskUpdate({
        taskId,
        identifier: info.identifier,
        status: 'running',
        progress,
        currentStep: step,
        duration: Date.now() - info.startedAt.getTime(),
      });

      this.gateway.broadcastLog({
        timestamp: new Date(),
        level: 'info',
        taskId,
        message: `[${info.identifier}] ${step}`,
      });
    }
  }

  /**
   * Update task session ID
   */
  taskSessionId(taskId: string, sessionId: string) {
    const info = this.runningTasks.get(taskId);
    if (info) {
      info.sessionId = sessionId;

      // Persist to SQLite
      this.sessionStore.updateSessionId(taskId, sessionId);

      this.gateway.broadcastTaskUpdate({
        taskId,
        identifier: info.identifier,
        status: 'running',
        progress: info.progress,
        currentStep: info.currentStep,
        duration: Date.now() - info.startedAt.getTime(),
        sessionId,
      });

      this.gateway.broadcastLog({
        timestamp: new Date(),
        level: 'info',
        taskId,
        message: `[${info.identifier}] Session ID: ${sessionId}`,
      });
    }
  }

  /**
   * Record task completion
   */
  taskCompleted(taskId: string, success: boolean, summary?: string) {
    const info = this.runningTasks.get(taskId);
    if (info) {
      const duration = Date.now() - info.startedAt.getTime();

      // Save to task history before deleting from running tasks
      this.taskHistory.set(taskId, {
        taskId,
        identifier: info.identifier,
        title: info.title,
        sessionId: info.sessionId,
        startedAt: info.startedAt,
        completedAt: new Date(),
        success,
      });

      // Persist completion to SQLite
      this.sessionStore.completeTask(taskId, success);

      this.gateway.broadcastTaskUpdate({
        taskId,
        identifier: info.identifier,
        status: success ? 'completed' : 'failed',
        progress: 100,
        duration,
        sessionId: info.sessionId,
      });

      this.gateway.broadcastLog({
        timestamp: new Date(),
        level: success ? 'info' : 'error',
        taskId,
        message: success
          ? `🎉 [${info.identifier}] Task completed (duration: ${Math.round(duration / 1000)}s)`
          : `❌ [${info.identifier}] Task failed: ${summary}`,
      });

      this.runningTasks.delete(taskId);

      // Refresh stats
      this.refreshStats();
    }
  }

  /**
   * Refresh and broadcast stats
   */
  async refreshStats() {
    const stats = await this.getDashboardStats();
    this.gateway.broadcastStats({
      todo: stats.linear.todo,
      inProgress: stats.linear.inProgress,
      inReview: stats.linear.inReview,
      done: stats.linear.done,
      failed: stats.linear.failed,
      queueLength: stats.queue.waiting,
    });
  }

  /**
   * Pause execution
   */
  pauseExecution(): boolean {
    this.isPaused = true;
    this.taskQueue.pause();
    this.gateway.broadcastLog({
      timestamp: new Date(),
      level: 'warn',
      message: '⏸ Execution paused',
    });
    return true;
  }

  /**
   * Resume execution
   */
  resumeExecution(): boolean {
    this.isPaused = false;
    this.taskQueue.resume();
    this.gateway.broadcastLog({
      timestamp: new Date(),
      level: 'info',
      message: '▶ Execution resumed',
    });
    return true;
  }

  /**
   * Get execution status
   */
  getExecutionStatus(): { paused: boolean } {
    return { paused: this.isPaused };
  }

  /**
   * Check if execution is paused
   */
  isExecutionPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Retry a failed task
   */
  async retryTask(taskId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get task details from Linear with state
      const taskDetails = await this.linearService.getIssueWithState(taskId);

      if (!taskDetails) {
        throw new NotFoundException(`Task with ID ${taskId} not found`);
      }

      // Verify task status is Failed
      if (!taskDetails.state || taskDetails.state.name !== TaskStatus.FAILED) {
        throw new BadRequestException(
          `Only failed tasks can be retried. Current status: ${taskDetails.state?.name || 'unknown'}`
        );
      }

      // Get the session ID from previous execution
      const sessionId = this.getTaskSessionId(taskId);

      if (!sessionId) {
        throw new BadRequestException(
          `No session found for task ${taskId}. Cannot retry without previous execution context.`
        );
      }

      // Update status to In Progress immediately
      await this.linearService.updateStatus(taskId, TaskStatus.IN_PROGRESS);

      // Add retry comment
      await this.linearService.addComment(
        taskId,
        `🔄 **Manual task retry**\n\n` +
        `Using previous execution context (Session ID: ${sessionId})\n` +
        `System will review the previous failure and retry...`
      );

      // Add to Bull queue with 'retry' job type
      const timeout = this.configService.get<number>('app.taskTimeout');
      await this.taskQueue.add('retry', {
        task: taskDetails,
        sessionId: sessionId,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        timeout: timeout,
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.gateway.broadcastLog({
        timestamp: new Date(),
        level: 'info',
        taskId,
        message: `🔄 [${taskDetails.identifier}] Task added to retry queue`,
      });

      // Refresh stats
      await this.refreshStats();

      return {
        success: true,
        message: `Task ${taskDetails.identifier} has been queued for retry`,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to retry task: ${error.message}`);
    }
  }
}
