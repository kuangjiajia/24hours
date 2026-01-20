import { Controller, Get, Post, Param } from '@nestjs/common';
import { MonitorService } from './monitor.service';
import { LinearService } from '../linear/linear.service';

@Controller('api/monitor')
export class MonitorController {
  constructor(
    private monitorService: MonitorService,
    private linearService: LinearService,
  ) {}

  /**
   * Get dashboard data
   */
  @Get('dashboard')
  async getDashboard() {
    return this.monitorService.getDashboardStats();
  }

  /**
   * Get queued tasks
   */
  @Get('queue')
  async getQueue() {
    return this.monitorService.getQueuedTasks();
  }

  /**
   * Get running task detail
   */
  @Get('tasks/:taskId')
  async getTaskDetail(@Param('taskId') taskId: string) {
    return this.monitorService.getTaskDetail(taskId);
  }

  /**
   * Get session ID for a task
   */
  @Get('tasks/:taskId/session')
  getTaskSession(@Param('taskId') taskId: string) {
    const sessionId = this.monitorService.getTaskSessionId(taskId);
    return { taskId, sessionId };
  }

  /**
   * Get task history
   */
  @Get('history')
  async getHistory() {
    return this.monitorService.getTaskHistory();
  }

  /**
   * Health check
   */
  @Get('health')
  async health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Get all tasks from Linear
   */
  @Get('linear/tasks')
  async getAllTasks() {
    const tasks = await this.linearService.getAllTasks();
    return { tasks };
  }

  /**
   * Get tasks by status from Linear
   */
  @Get('linear/tasks/:status')
  async getTasksByStatus(@Param('status') status: string) {
    const tasks = await this.linearService.getTasksByStatus(status);
    return { status, tasks };
  }

  /**
   * Get issue with comments from Linear
   */
  @Get('linear/issues/:issueId')
  async getIssueWithComments(@Param('issueId') issueId: string) {
    return this.linearService.getIssueWithComments(issueId);
  }

  /**
   * Get comments for an issue from Linear
   */
  @Get('linear/issues/:issueId/comments')
  async getIssueComments(@Param('issueId') issueId: string) {
    const comments = await this.linearService.getComments(issueId);
    return { issueId, comments };
  }

  /**
   * Get all available states
   */
  @Get('linear/states')
  async getStates() {
    return this.linearService.getAvailableStates();
  }

  /**
   * Pause execution
   */
  @Post('execution/pause')
  pauseExecution() {
    return { success: this.monitorService.pauseExecution() };
  }

  /**
   * Resume execution
   */
  @Post('execution/resume')
  resumeExecution() {
    return { success: this.monitorService.resumeExecution() };
  }

  /**
   * Get execution status
   */
  @Get('execution/status')
  getExecutionStatus() {
    return this.monitorService.getExecutionStatus();
  }

  /**
   * Retry a failed task
   */
  @Post('tasks/:taskId/retry')
  async retryTask(@Param('taskId') taskId: string) {
    return this.monitorService.retryTask(taskId);
  }
}
