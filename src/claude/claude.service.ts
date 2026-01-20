import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { LinearTask } from '../linear/linear.types';
import { LinearService } from '../linear/linear.service';
import {
  buildTaskPrompt,
  buildSystemPrompt,
  buildFeedbackPrompt,
} from './prompts/task-execution.prompt';
import { ProgressCallback, TaskExecutionResult } from '../queue/task.interface';
import { SettingsProviderService } from '../settings/settings-provider.service';

type AuthMethod = 'api_key' | 'login';

@Injectable()
export class ClaudeService implements OnModuleInit {
  private readonly logger = new Logger(ClaudeService.name);

  constructor(
    private settingsProvider: SettingsProviderService,
    private linearService: LinearService,
  ) {}

  onModuleInit() {
    // Log configuration after all modules are initialized
    const authMethod = this.settingsProvider.getAuthMethod();
    this.logger.log(`Claude authentication method: ${authMethod}`);

    if (authMethod === 'api_key') {
      this.logger.log(`Using proxy API: ${this.settingsProvider.getAnthropicBaseUrl()}`);
    } else {
      this.logger.log('Using standard Anthropic API');
    }

    const workspacePath = this.settingsProvider.getWorkspacePath();
    if (workspacePath) {
      this.logger.log(`Claude workspace restricted to: ${workspacePath}`);
    }
  }

  /**
   * Get current auth method (dynamic, reads from settings each time)
   */
  private getAuthMethod(): AuthMethod {
    return this.settingsProvider.getAuthMethod();
  }

  /**
   * Get current workspace path (dynamic, reads from settings each time)
   */
  private getWorkspacePath(): string | undefined {
    return this.settingsProvider.getWorkspacePath();
  }

  /**
   * Build environment variables based on authentication method
   * - 'api_key': Use proxy API (ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN as ANTHROPIC_API_KEY)
   * - 'login': Use standard Anthropic API (ANTHROPIC_API_KEY)
   */
  private buildEnvVars(): Record<string, string | undefined> {
    const baseEnv = { ...process.env };
    const authMethod = this.getAuthMethod();

    if (authMethod === 'api_key') {
      // For proxy API billing: use ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN
      const baseUrl = this.settingsProvider.getAnthropicBaseUrl();
      const authToken = this.settingsProvider.getAnthropicAuthToken();

      if (!baseUrl || !authToken) {
        throw new Error('ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN are required for api_key mode');
      }

      return {
        ...baseEnv,
        ANTHROPIC_BASE_URL: baseUrl,
        ANTHROPIC_API_KEY: authToken, // Proxy uses auth token as API key
      };
    }

    // For login mode: use standard Anthropic API key
    const apiKey = this.settingsProvider.getAnthropicApiKey();
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for login mode');
    }

    return {
      ...baseEnv,
      ANTHROPIC_API_KEY: apiKey,
      // Remove any proxy settings for standard API
      ANTHROPIC_BASE_URL: undefined,
    };
  }

  /**
   * Execute a task using Claude Agent SDK with MCP support
   */
  async executeTask(
    task: LinearTask,
    callbacks?: ProgressCallback,
  ): Promise<TaskExecutionResult> {
    const authMethod = this.getAuthMethod();
    const workspacePath = this.getWorkspacePath();

    this.logger.log(`Executing task: ${task.identifier} (auth: ${authMethod})`);
    const startTime = Date.now();

    try {
      // Post initial comment via LinearService (before Claude starts)
      callbacks?.onProgress('🚀 Starting task execution', 10);

      // Build prompts
      const taskPrompt = buildTaskPrompt(task);
      const systemPrompt = buildSystemPrompt();

      this.logger.log('Creating Claude Agent query...');

      // Build environment variables based on auth method
      const envVars = this.buildEnvVars();

      // Create a query using Claude Agent SDK V1 (full features)
      const agentQuery = query({
        prompt: taskPrompt,
        options: {
          model: 'claude-sonnet-4-5-20250929',
          systemPrompt,
          // Pass environment variables to Claude Code subprocess
          env: envVars,
          // Set working directory if workspace path is configured
          cwd: workspacePath,
          // Bypass all permission checks for automated task execution
          permissionMode: 'bypassPermissions',
          allowDangerouslySkipPermissions: true,
          // MCP servers configuration for Linear integration
          mcpServers: {
            linear: {
              type: 'stdio',
              command: 'npx',
              args: ['-y', 'mcp-remote', 'https://mcp.linear.app/mcp'],
              env: {
                LINEAR_API_KEY: this.settingsProvider.getLinearApiKey() || '',
              },
            },
          },
        },
      });

      // Collect response text and track progress
      let responseText = '';
      let lastProgress = 10;
      let toolCallCount = 0;
      let sessionId: string | undefined;

      // Process streaming messages
      for await (const msg of agentQuery) {
        this.processMessage(msg, task.id, callbacks, {
          onText: (text: string) => {
            responseText += text;
          },
          onToolUse: (toolName: string) => {
            toolCallCount++;
            // Update progress based on tool calls
            lastProgress = Math.min(90, 20 + toolCallCount * 15);
            this.logger.log(`Tool used: ${toolName}`);
            callbacks?.onProgress(`Using tool: ${toolName}`, lastProgress);
          },
          onResult: (result: string) => {
            this.logger.log(`Query result: ${result.slice(0, 100)}...`);
          },
          onSessionId: (id: string) => {
            sessionId = id;
            this.logger.log(`Session ID captured: ${id}`);
            callbacks?.onSessionId?.(id);
          },
        });
      }

      this.logger.log(`Claude query completed, processed ${toolCallCount} tool calls`);

      // Check for failure indicators in response
      const hasError =
        responseText.includes('❌') && responseText.includes('failed');

      if (hasError) {
        callbacks?.onProgress('❌ Task execution failed', 100);
        return {
          success: false,
          error: responseText,
          sessionId,
        };
      }

      // Calculate execution time
      const duration = Math.round((Date.now() - startTime) / 1000);

      // Post completion summary if Claude didn't already
      if (!responseText.includes('🎉') && !responseText.includes('👀')) {
        await this.linearService.addComment(
          task.id,
          `🎉 Task completed\n\n**Execution Summary:**\n${responseText.slice(0, 500)}\n\n**Duration:** ${duration} seconds`,
        );
      }

      callbacks?.onProgress('🎉 Task completed', 100);

      return {
        success: true,
        sessionId,
      };
    } catch (error) {
      this.logger.error('Claude execution failed:', error);
      this.logger.error('Error details:', error.message, error.stack);

      // Provide helpful error message based on auth method
      let errorMessage = error.message;
      if (error.message.includes('401') || error.message.includes('invalid token') || error.message.includes('invalid')) {
        if (authMethod === 'api_key') {
          errorMessage = `Proxy API authentication failed. Please check if ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN are correct.\nOriginal error: ${error.message}`;
        } else {
          errorMessage = `Anthropic API authentication failed. Please check if ANTHROPIC_API_KEY is correct.\nOriginal error: ${error.message}`;
        }
      }

      // Post error comment
      await this.linearService.addComment(
        task.id,
        `❌ Task execution failed\n\n**Error:**\n\`\`\`\n${errorMessage}\n\`\`\``,
      );

      callbacks?.onProgress(`❌ Execution failed: ${errorMessage}`, 100);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Process SDK messages and extract relevant information
   */
  private processMessage(
    msg: SDKMessage,
    taskId: string,
    callbacks?: ProgressCallback,
    handlers?: {
      onText?: (text: string) => void;
      onToolUse?: (toolName: string) => void;
      onResult?: (result: string) => void;
      onSessionId?: (sessionId: string) => void;
    },
  ): void {
    switch (msg.type) {
      case 'assistant':
        // Extract text content from assistant message
        if (msg.message && msg.message.content) {
          for (const block of msg.message.content) {
            if (block.type === 'text') {
              handlers?.onText?.(block.text);
              this.logger.debug(`Assistant text: ${block.text.slice(0, 100)}...`);
            } else if (block.type === 'tool_use') {
              handlers?.onToolUse?.(block.name);
              this.logger.log(`Tool call: ${block.name}`);
            }
          }
        }
        break;

      case 'result':
        // Final result message
        if (msg.subtype === 'success' && msg.result) {
          handlers?.onResult?.(msg.result);
        } else if (msg.subtype !== 'success') {
          this.logger.warn(`Query finished with error subtype: ${msg.subtype}`);
        }
        break;

      case 'system':
        // Extract session_id from init message
        if (msg.subtype === 'init' && msg.session_id) {
          handlers?.onSessionId?.(msg.session_id);
        }
        this.logger.debug(`System message: ${JSON.stringify(msg)}`);
        break;

      case 'tool_progress':
        this.logger.debug(`Tool progress for task ${taskId}: ${JSON.stringify(msg)}`);
        break;

      case 'auth_status':
        this.logger.debug(`Auth status: ${JSON.stringify(msg)}`);
        break;

      default:
        // Handle other message types
        this.logger.debug(`Message type: ${msg.type}`);
    }
  }

  /**
   * Execute feedback processing by resuming the previous session
   * Uses V1 query() API with resume option to maintain full configuration
   */
  async executeFeedback(
    task: LinearTask,
    feedback: string,
    sessionId: string,
    callbacks?: ProgressCallback,
  ): Promise<TaskExecutionResult> {
    const authMethod = this.getAuthMethod();
    const workspacePath = this.getWorkspacePath();

    this.logger.log(
      `Resuming session ${sessionId} for feedback on ${task.identifier} (auth: ${authMethod})`,
    );
    const startTime = Date.now();

    try {
      callbacks?.onProgress('🔄 Processing feedback', 10);

      // Build feedback prompt
      const feedbackPrompt = buildFeedbackPrompt(task, feedback);

      this.logger.log(`Resuming Claude session ${sessionId}...`);

      // Build environment variables based on auth method
      const envVars = this.buildEnvVars();

      // Use V1 query() API with resume option to maintain full configuration
      const agentQuery = query({
        prompt: feedbackPrompt,
        options: {
          model: 'claude-sonnet-4-5-20250929',
          // Resume the previous session
          resume: sessionId,
          // Pass environment variables to Claude Code subprocess
          env: envVars,
          // Set working directory if workspace path is configured
          cwd: workspacePath,
          // Bypass all permission checks for automated task execution
          permissionMode: 'bypassPermissions',
          allowDangerouslySkipPermissions: true,
          // MCP servers configuration for Linear integration
          mcpServers: {
            linear: {
              type: 'stdio',
              command: 'npx',
              args: ['-y', 'mcp-remote', 'https://mcp.linear.app/mcp'],
              env: {
                LINEAR_API_KEY: this.settingsProvider.getLinearApiKey() || '',
              },
            },
          },
        },
      });

      // Collect response text and track progress
      let responseText = '';
      let lastProgress = 10;
      let toolCallCount = 0;
      let newSessionId: string | undefined;

      // Process streaming messages
      for await (const msg of agentQuery) {
        this.processMessage(msg, task.id, callbacks, {
          onText: (text: string) => {
            responseText += text;
          },
          onToolUse: (toolName: string) => {
            toolCallCount++;
            // Update progress based on tool calls
            lastProgress = Math.min(90, 20 + toolCallCount * 15);
            this.logger.log(`Tool used: ${toolName}`);
            callbacks?.onProgress(`Using tool: ${toolName}`, lastProgress);
          },
          onResult: (result: string) => {
            this.logger.log(`Query result: ${result.slice(0, 100)}...`);
          },
          onSessionId: (id: string) => {
            newSessionId = id;
            this.logger.log(`Session ID captured: ${id}`);
            callbacks?.onSessionId?.(id);
          },
        });
      }

      this.logger.log(
        `Claude feedback processing completed, processed ${toolCallCount} tool calls`,
      );

      // Check for failure indicators in response
      const hasError =
        responseText.includes('❌') && responseText.includes('failed');

      if (hasError) {
        callbacks?.onProgress('❌ Feedback processing failed', 100);
        return {
          success: false,
          error: responseText,
          sessionId: newSessionId || sessionId,
        };
      }

      // Calculate execution time
      const duration = Math.round((Date.now() - startTime) / 1000);

      // Post completion summary if Claude didn't already
      if (!responseText.includes('🎉') && !responseText.includes('👀')) {
        await this.linearService.addComment(
          task.id,
          `🎉 Feedback processed\n\n**Execution Summary:**\n${responseText.slice(0, 500)}\n\n**Duration:** ${duration} seconds`,
        );
      }

      callbacks?.onProgress('🎉 Feedback processed', 100);

      return {
        success: true,
        sessionId: newSessionId || sessionId,
      };
    } catch (error) {
      this.logger.error('Claude feedback execution failed:', error);
      this.logger.error('Error details:', error.message, error.stack);

      // Provide helpful error message based on auth method
      let errorMessage = error.message;
      if (
        error.message.includes('401') ||
        error.message.includes('invalid token') ||
        error.message.includes('invalid')
      ) {
        if (authMethod === 'api_key') {
          errorMessage = `Proxy API authentication failed. Please check if ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN are correct.\nOriginal error: ${error.message}`;
        } else {
          errorMessage = `Anthropic API authentication failed. Please check if ANTHROPIC_API_KEY is correct.\nOriginal error: ${error.message}`;
        }
      }

      // Post error comment
      await this.linearService.addComment(
        task.id,
        `❌ Feedback processing failed\n\n**Error:**\n\`\`\`\n${errorMessage}\n\`\`\``,
      );

      callbacks?.onProgress(`❌ Execution failed: ${errorMessage}`, 100);
      return {
        success: false,
        error: errorMessage,
        sessionId,
      };
    }
  }
}
