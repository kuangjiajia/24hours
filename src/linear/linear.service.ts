import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LinearClient } from '@linear/sdk';
import { LinearTask, LinearState, LinearComment, TaskStatus } from './linear.types';
import { SettingsProviderService } from '../settings/settings-provider.service';

@Injectable()
export class LinearService implements OnModuleInit {
  private readonly logger = new Logger(LinearService.name);
  private client: LinearClient | null = null;
  private teamKey: string = '';
  private teamId: string = '';
  private stateCache: Map<string, LinearState> = new Map();
  private isConfigured: boolean = false;

  constructor(private settingsProvider: SettingsProviderService) {}

  async onModuleInit() {
    await this.initializeClient();
  }

  /**
   * Initialize or reinitialize the Linear client
   * Can be called when settings are updated
   */
  async initializeClient(): Promise<boolean> {
    const apiKey = this.settingsProvider.getLinearApiKey();
    this.teamKey = this.settingsProvider.getLinearTeamId() || '';

    if (!apiKey) {
      this.logger.warn('LINEAR_API_KEY not configured. Linear integration is disabled.');
      this.logger.warn('Please configure Linear API Key in Settings to enable Linear integration.');
      this.client = null;
      this.isConfigured = false;
      return false;
    }

    try {
      this.client = new LinearClient({ apiKey });
      this.isConfigured = true;

      // Find the actual team ID by team key
      await this.resolveTeamId();

      // Cache states on startup
      await this.refreshStateCache();

      this.logger.log('Linear client initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Linear client:', error.message);
      this.client = null;
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Check if Linear is configured and ready
   */
  isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Ensure client is ready, attempt to initialize if not
   */
  private async ensureClient(): Promise<boolean> {
    if (this.isReady()) {
      return true;
    }

    // Try to initialize
    return await this.initializeClient();
  }

  /**
   * Resolve team key to actual team UUID
   */
  private async resolveTeamId(): Promise<void> {
    if (!this.client) return;

    try {
      const teams = await this.client.teams();
      const team = teams.nodes.find((t) => t.key === this.teamKey);

      if (team) {
        this.teamId = team.id;
        this.logger.log(
          `Team resolved: ${this.teamKey} -> ${this.teamId} (${team.name})`,
        );
      } else {
        this.logger.warn(`Team with key "${this.teamKey}" not found`);
        // List available teams for debugging
        const availableTeams = teams.nodes.map((t) => `${t.key}: ${t.name}`);
        this.logger.log(`Available teams: ${availableTeams.join(', ')}`);
        // Use first team if teamKey not specified
        if (!this.teamKey && teams.nodes.length > 0) {
          this.teamId = teams.nodes[0].id;
          this.teamKey = teams.nodes[0].key;
          this.logger.log(`Using first available team: ${this.teamKey}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to resolve team ID:', error.message);
    }
  }

  /**
   * Refresh the state cache
   */
  async refreshStateCache(): Promise<void> {
    if (!this.client || !this.teamId) {
      this.logger.warn('Cannot refresh state cache: client or team not ready');
      return;
    }

    try {
      const team = await this.client.team(this.teamId);
      const states = await team.states();

      this.stateCache.clear();
      for (const state of states.nodes) {
        this.stateCache.set(state.name, {
          id: state.id,
          name: state.name,
          type: state.type,
        });
      }

      this.logger.log(
        `State cache refreshed: ${Array.from(this.stateCache.keys()).join(', ')}`,
      );
    } catch (error) {
      this.logger.error('Failed to refresh state cache:', error.message);
    }
  }

  /**
   * Get state ID by name
   */
  private getStateId(statusName: string): string | undefined {
    return this.stateCache.get(statusName)?.id;
  }

  /**
   * Get tasks by status name
   */
  async getTasksByStatus(statusName: string): Promise<LinearTask[]> {
    if (!(await this.ensureClient()) || !this.teamId) {
      return [];
    }

    try {
      const stateId = this.getStateId(statusName);
      if (!stateId) {
        this.logger.warn(`Status "${statusName}" not found in cache`);
        await this.refreshStateCache();
        const refreshedStateId = this.getStateId(statusName);
        if (!refreshedStateId) {
          this.logger.warn(`Status "${statusName}" still not found after refresh`);
          return [];
        }
      }

      const finalStateId = this.getStateId(statusName);
      if (!finalStateId) {
        return [];
      }

      const issues = await this.client!.issues({
        filter: {
          team: { id: { eq: this.teamId } },
          state: { id: { eq: finalStateId } },
        },
      });

      return issues.nodes.map((issue) => ({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        createdAt: issue.createdAt,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get tasks with status "${statusName}":`,
        error.message,
      );
      return [];
    }
  }

  /**
   * Lock a task by updating its status to In Progress
   */
  async lockTask(issueId: string): Promise<boolean> {
    if (!(await this.ensureClient())) {
      this.logger.warn('Cannot lock task: Linear not configured');
      return false;
    }

    try {
      const inProgressStateId = this.getStateId(TaskStatus.IN_PROGRESS);
      if (!inProgressStateId) {
        throw new Error('In Progress state not found');
      }

      await this.client!.updateIssue(issueId, {
        stateId: inProgressStateId,
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to lock task ${issueId}:`, error.message);
      return false;
    }
  }

  /**
   * Update task status
   */
  async updateStatus(issueId: string, statusName: string): Promise<boolean> {
    if (!(await this.ensureClient())) {
      this.logger.warn('Cannot update status: Linear not configured');
      return false;
    }

    try {
      const stateId = this.getStateId(statusName);
      if (!stateId) {
        await this.refreshStateCache();
        const refreshedStateId = this.getStateId(statusName);
        if (!refreshedStateId) {
          throw new Error(`Status "${statusName}" not found`);
        }
      }

      const finalStateId = this.getStateId(statusName);
      if (!finalStateId) {
        throw new Error(`Status "${statusName}" not found`);
      }

      await this.client!.updateIssue(issueId, {
        stateId: finalStateId,
      });

      this.logger.log(`Task ${issueId} status updated to ${statusName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to update status for ${issueId}:`, error.message);
      return false;
    }
  }

  /**
   * Add a comment to a task
   * @param issueId - The issue ID to add the comment to
   * @param content - The comment content
   */
  async addComment(issueId: string, content: string): Promise<boolean> {
    if (!(await this.ensureClient())) {
      this.logger.warn('Cannot add comment: Linear not configured');
      return false;
    }

    try {
      await this.client!.createComment({
        issueId,
        body: content,
      });

      this.logger.debug(`Comment added to ${issueId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to add comment to ${issueId}:`, error.message);
      return false;
    }
  }

  /**
   * Get a single issue by ID
   */
  async getIssue(issueId: string): Promise<LinearTask | null> {
    if (!(await this.ensureClient())) {
      return null;
    }

    try {
      const issue = await this.client!.issue(issueId);
      return {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        createdAt: issue.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get issue ${issueId}:`, error.message);
      return null;
    }
  }

  /**
   * Get a single issue with full details including state
   */
  async getIssueWithState(issueId: string): Promise<LinearTask | null> {
    if (!(await this.ensureClient())) {
      return null;
    }

    try {
      const issue = await this.client!.issue(issueId);
      const state = await issue.state;
      const assignee = await issue.assignee;
      const labels = await issue.labels();

      return {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        state: state
          ? {
              id: state.id,
              name: state.name,
              type: state.type,
              color: state.color,
            }
          : undefined,
        assignee: assignee
          ? {
              id: assignee.id,
              name: assignee.name,
              avatarUrl: assignee.avatarUrl,
            }
          : undefined,
        labels: labels.nodes.map((label) => ({
          id: label.id,
          name: label.name,
          color: label.color,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get issue with state ${issueId}:`, error.message);
      return null;
    }
  }

  /**
   * Get comments for an issue
   */
  async getComments(issueId: string): Promise<LinearComment[]> {
    if (!(await this.ensureClient())) {
      return [];
    }

    try {
      const issue = await this.client!.issue(issueId);
      const comments = await issue.comments();

      const result: LinearComment[] = [];
      for (const comment of comments.nodes) {
        const user = await comment.user;
        result.push({
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt,
          user: user
            ? {
                id: user.id,
                name: user.name,
                avatarUrl: user.avatarUrl,
              }
            : undefined,
        });
      }

      // Sort by createdAt desc
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to get comments for ${issueId}:`, error.message);
      return [];
    }
  }

  /**
   * Get issue with comments
   */
  async getIssueWithComments(
    issueId: string,
  ): Promise<{ issue: LinearTask; comments: LinearComment[] } | null> {
    if (!(await this.ensureClient())) {
      return null;
    }

    try {
      const issue = await this.client!.issue(issueId);
      const comments = await this.getComments(issueId);
      const state = await issue.state;
      const assignee = await issue.assignee;
      const labels = await issue.labels();

      return {
        issue: {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          state: state
            ? {
                id: state.id,
                name: state.name,
                type: state.type,
                color: state.color,
              }
            : undefined,
          assignee: assignee
            ? {
                id: assignee.id,
                name: assignee.name,
                avatarUrl: assignee.avatarUrl,
              }
            : undefined,
          labels: labels.nodes.map((label) => ({
            id: label.id,
            name: label.name,
            color: label.color,
          })),
        },
        comments,
      };
    } catch (error) {
      this.logger.error(`Failed to get issue with comments ${issueId}:`, error.message);
      return null;
    }
  }

  /**
   * Get all available states
   */
  getAvailableStates(): LinearState[] {
    return Array.from(this.stateCache.values());
  }

  /**
   * Get all tasks for the team
   */
  async getAllTasks(): Promise<LinearTask[]> {
    if (!(await this.ensureClient()) || !this.teamId) {
      return [];
    }

    try {
      const issues = await this.client!.issues({
        filter: {
          team: { id: { eq: this.teamId } },
        },
        first: 100,
      });

      const tasks: LinearTask[] = [];
      for (const issue of issues.nodes) {
        const state = await issue.state;
        const assignee = await issue.assignee;
        const labels = await issue.labels();

        tasks.push({
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          state: state
            ? {
                id: state.id,
                name: state.name,
                type: state.type,
                color: state.color,
              }
            : undefined,
          assignee: assignee
            ? {
                id: assignee.id,
                name: assignee.name,
                avatarUrl: assignee.avatarUrl,
              }
            : undefined,
          labels: labels.nodes.map((label) => ({
            id: label.id,
            name: label.name,
            color: label.color,
          })),
        });
      }

      // Sort by priority (higher priority first) then by createdAt
      tasks.sort((a, b) => {
        const priorityDiff = (a.priority || 0) - (b.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      return tasks;
    } catch (error) {
      this.logger.error('Failed to get all tasks:', error.message);
      return [];
    }
  }
}
