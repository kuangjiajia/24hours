import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { LinearService } from '../linear/linear.service';
import { TaskStatus } from '../linear/linear.types';

@Injectable()
export class TaskPollerService {
  private readonly logger = new Logger(TaskPollerService.name);
  private isPolling = false;

  constructor(
    private linearService: LinearService,
    private configService: ConfigService,
    @InjectQueue('task-queue') private taskQueue: Queue,
  ) {}

  @Cron('*/30 * * * * *') // Every 30 seconds
  async pollTasks() {
    // Prevent overlapping execution
    if (this.isPolling) {
      this.logger.warn('Previous polling still in progress, skipping...');
      return;
    }

    this.isPolling = true;
    this.logger.log('Starting task polling...');

    try {
      const tasks = await this.linearService.getTasksByStatus(TaskStatus.TODO);
      this.logger.log(`Found ${tasks.length} tasks in Todo status`);

      for (const task of tasks) {
        // Lock the task first
        const locked = await this.linearService.lockTask(task.id);

        if (!locked) {
          this.logger.warn(`Task ${task.identifier} already locked, skipping`);
          continue;
        }

        // Add initial comment
        await this.linearService.addComment(
          task.id,
          '🚀 Task received by system, execution starting soon...',
        );

        // Add to queue
        const timeout = this.configService.get<number>('app.taskTimeout');
        await this.taskQueue.add('execute', task, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          timeout: timeout,
          removeOnComplete: true,
          removeOnFail: false,
        });

        this.logger.log(`Task ${task.identifier} added to queue`);
      }
    } catch (error) {
      this.logger.error('Polling failed:', error);
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
