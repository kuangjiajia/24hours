import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { LinearService } from '../linear/linear.service';
import { SessionStoreService } from '../monitor/session-store.service';
import { TaskStatus } from '../linear/linear.types';

@Injectable()
export class ReviewPollerService {
  private readonly logger = new Logger(ReviewPollerService.name);
  private isPolling = false;

  constructor(
    private linearService: LinearService,
    private configService: ConfigService,
    private sessionStore: SessionStoreService,
    @InjectQueue('task-queue') private taskQueue: Queue,
  ) {}

  @Cron('*/30 * * * * *') // Every 30 seconds
  async pollReviewTasks() {
    // Prevent overlapping execution
    if (this.isPolling) {
      this.logger.warn('Previous review polling still in progress, skipping...');
      return;
    }

    this.isPolling = true;
    this.logger.debug('Starting review task polling...');

    try {
      // Get all "In Review" tasks
      const tasks = await this.linearService.getTasksByStatus(TaskStatus.IN_REVIEW);
      this.logger.debug(`Found ${tasks.length} tasks in "In Review" status`);

      for (const task of tasks) {
        // Get session ID from SQLite
        const session = this.sessionStore.getSessionByTaskId(task.id);
        if (!session?.sessionId) {
          this.logger.warn(`No session ID found for task ${task.identifier}, skipping`);
          continue;
        }

        // Get comments for this task
        const comments = await this.linearService.getComments(task.id);

        // Filter: exclude system comments (by checking if comment starts with 🤖)
        // Filter: exclude already processed comments
        const newUserComments = comments.filter(
          (c) =>
            !c.body.startsWith('🤖 \n') &&
            !this.sessionStore.isCommentProcessed(c.id),
        );

        if (newUserComments.length === 0) {
          this.logger.debug(`No new user comments for task ${task.identifier}`);
          continue;
        }

        this.logger.log(
          `Found ${newUserComments.length} new user comment(s) for task ${task.identifier}`,
        );

        // Merge all unprocessed comments into one feedback
        const feedback = newUserComments.map((c) => c.body).join('\n\n---\n\n');
        const commentIds = newUserComments.map((c) => c.id);

        // Add to queue with feedback job type
        const timeout = this.configService.get<number>('app.taskTimeout');
        await this.taskQueue.add(
          'feedback',
          {
            task,
            feedback,
            commentIds,
            sessionId: session.sessionId,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
            timeout: timeout,
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        this.logger.log(
          `Feedback job for task ${task.identifier} added to queue (session: ${session.sessionId})`,
        );
      }
    } catch (error) {
      this.logger.error('Review polling failed:', error);
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Get polling status
   */
  getPollingStatus(): boolean {
    return this.isPolling;
  }
}
