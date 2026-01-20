import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bull';
import { ClaudeService } from '../claude/claude.service';
import { LinearService } from '../linear/linear.service';
import { MonitorService } from '../monitor/monitor.service';
import { SessionStoreService } from '../monitor/session-store.service';
import { LinearTask, TaskStatus } from '../linear/linear.types';
import { FeedbackJob, RetryJob } from './task.interface';

@Processor('task-queue')
export class TaskProcessor {
  private readonly logger = new Logger(TaskProcessor.name);

  // Keywords that trigger review requirement
  private readonly REVIEW_KEYWORDS = [
    'write',
    'generate',
    'create',
    'send',
    'email',
    'article',
    'report',
    'delete',
    'modify',
    'update',
    'code',
    'script',
  ];

  constructor(
    private claudeService: ClaudeService,
    private linearService: LinearService,
    private sessionStore: SessionStoreService,
    @Inject(forwardRef(() => MonitorService))
    private monitorService: MonitorService,
  ) {}

  @Process('execute')
  async handleTask(job: Job<LinearTask>) {
    const task = job.data;
    this.logger.log(`Processing task: ${task.identifier}`);

    // Notify monitor: task started
    this.monitorService.taskStarted(task.id, task.identifier, task.title);

    try {
      // Execute task with Claude
      const result = await this.claudeService.executeTask(task, {
        onProgress: (step: string, progress: number) => {
          this.monitorService.taskProgress(task.id, step, progress);
        },
        onSessionId: (sessionId: string) => {
          this.monitorService.taskSessionId(task.id, sessionId);
        },
      });

      if (result.success) {
        // Check if review is needed
        const needsReview = this.checkNeedsReview(task);

        if (needsReview) {
          // Needs review: update status to In Review
          await this.linearService.updateStatus(task.id, TaskStatus.IN_REVIEW);
          await this.linearService.addComment(
            task.id,
            `👀 **Task completed, awaiting human review**\n\n` +
              `Please check the execution result, then:\n` +
              `- ✅ Approved → Change status to "Done"\n` +
              `- 🔄 Needs changes → Reply with feedback, change status back to "Todo"\n` +
              `- ❌ Cancel task → Change status to "Canceled"`,
          );
          this.logger.log(
            `Task ${task.identifier} completed, waiting for review`,
          );
        } else {
          // No review needed: complete directly
          await this.linearService.updateStatus(task.id, TaskStatus.DONE);
          this.logger.log(`Task ${task.identifier} completed successfully`);
        }

        // Notify monitor: task completed
        this.monitorService.taskCompleted(task.id, true);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.logger.error(`Task ${task.identifier} failed:`, error);

      // Update status to Failed
      await this.linearService.updateStatus(task.id, TaskStatus.FAILED);
      await this.linearService.addComment(
        task.id,
        `❌ Task execution failed\n\n**Error:**\n\`\`\`\n${error.message}\n\`\`\`\n\n**Retry attempts:** ${job.attemptsMade}/${job.opts.attempts}`,
      );

      // Notify monitor: task failed
      this.monitorService.taskCompleted(task.id, false, error.message);

      throw error; // Trigger retry
    }
  }

  /**
   * Check if task needs human review
   */
  private checkNeedsReview(task: LinearTask): boolean {
    const content = `${task.title} ${task.description || ''}`.toLowerCase();

    // Check for review keywords
    return this.REVIEW_KEYWORDS.some((keyword) => content.includes(keyword));
  }

  @OnQueueFailed()
  async handleFailed(job: Job<LinearTask>, error: Error) {
    this.logger.error(
      `Job ${job.id} finally failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  @Process('feedback')
  async handleFeedback(job: Job<FeedbackJob>) {
    const { task, feedback, commentIds, sessionId } = job.data;
    this.logger.log(`Processing feedback for task: ${task.identifier}`);

    // Notify monitor: feedback processing started
    this.monitorService.taskStarted(
      task.id,
      task.identifier,
      `[Feedback] ${task.title}`,
    );

    try {
      // Update status to In Progress
      await this.linearService.updateStatus(task.id, TaskStatus.IN_PROGRESS);

      // Post comment with system marker
      await this.linearService.addComment(
        task.id,
        `🔄 Processing your feedback...`,
      );

      // Execute feedback with Claude using session resumption
      const result = await this.claudeService.executeFeedback(
        task,
        feedback,
        sessionId,
        {
          onProgress: (step: string, progress: number) => {
            this.monitorService.taskProgress(task.id, step, progress);
          },
          onSessionId: (newSessionId: string) => {
            this.monitorService.taskSessionId(task.id, newSessionId);
          },
        },
      );

      // Mark comments as processed
      this.sessionStore.markCommentsProcessed(commentIds, task.id);

      if (result.success) {
        this.logger.log(`Feedback for task ${task.identifier} processed successfully`);
        this.monitorService.taskCompleted(task.id, true);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.logger.error(`Feedback processing for ${task.identifier} failed:`, error);

      // Update status to Failed
      await this.linearService.updateStatus(task.id, TaskStatus.FAILED);
      await this.linearService.addComment(
        task.id,
        `❌ Feedback processing failed\n\n**Error:**\n\`\`\`\n${error.message}\n\`\`\`\n\n**Retry attempts:** ${job.attemptsMade}/${job.opts.attempts}`,
      );

      // Notify monitor: task failed
      this.monitorService.taskCompleted(task.id, false, error.message);

      throw error; // Trigger retry
    }
  }

  @Process('retry')
  async handleRetry(job: Job<RetryJob>) {
    const { task, sessionId } = job.data;
    this.logger.log(`Processing retry for task: ${task.identifier}`);

    // Notify monitor: retry processing started
    this.monitorService.taskStarted(
      task.id,
      task.identifier,
      `[Retry] ${task.title}`,
    );

    try {
      // Post comment with system marker
      await this.linearService.addComment(
        task.id,
        `🔄 Retrying task execution...`,
      );

      // Prepare retry prompt
      const retryPrompt =
        `This is a task retry. Please review the previous execution history, identify the cause of failure, and attempt to complete the task again.\n\n` +
        `Pay special attention to:\n` +
        `1. Review the previous error messages\n` +
        `2. Analyze the failure cause\n` +
        `3. Take a different approach or fix the error\n` +
        `4. Re-execute the task`;

      // Execute retry with Claude using session resumption
      const result = await this.claudeService.executeFeedback(
        task,
        retryPrompt,
        sessionId,
        {
          onProgress: (step: string, progress: number) => {
            this.monitorService.taskProgress(task.id, step, progress);
          },
          onSessionId: (newSessionId: string) => {
            this.monitorService.taskSessionId(task.id, newSessionId);
          },
        },
      );

      if (result.success) {
        // Check if review is needed
        const needsReview = this.checkNeedsReview(task);

        if (needsReview) {
          // Needs review: update status to In Review
          await this.linearService.updateStatus(task.id, TaskStatus.IN_REVIEW);
          await this.linearService.addComment(
            task.id,
            `👀 **Retry completed, awaiting human review**\n\n` +
              `Please check the execution result, then:\n` +
              `- ✅ Approved → Change status to "Done"\n` +
              `- 🔄 Needs changes → Reply with feedback, change status back to "Todo"\n` +
              `- ❌ Cancel task → Change status to "Canceled"`,
          );
          this.logger.log(
            `Retry task ${task.identifier} completed, waiting for review`,
          );
        } else {
          // No review needed: complete directly
          await this.linearService.updateStatus(task.id, TaskStatus.DONE);
          await this.linearService.addComment(
            task.id,
            `✅ **Retry successful! Task completed**`,
          );
          this.logger.log(`Retry task ${task.identifier} completed successfully`);
        }

        this.monitorService.taskCompleted(task.id, true);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.logger.error(`Retry for ${task.identifier} failed:`, error);

      // Update status to Failed
      await this.linearService.updateStatus(task.id, TaskStatus.FAILED);
      await this.linearService.addComment(
        task.id,
        `❌ Retry failed\n\n**Error:**\n\`\`\`\n${error.message}\n\`\`\`\n\n**Retry attempts:** ${job.attemptsMade}/${job.opts.attempts}`,
      );

      // Notify monitor: task failed
      this.monitorService.taskCompleted(task.id, false, error.message);

      throw error; // Trigger retry
    }
  }
}
