import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';

/**
 * SettingsProviderService provides a unified interface for retrieving configuration values.
 * Priority: Database (user-configured) > .env (default)
 * Used by ClaudeService, LinearService, and other services that need configuration.
 */
@Injectable()
export class SettingsProviderService {
  private readonly logger = new Logger(SettingsProviderService.name);

  constructor(
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get a setting value with fallback to .env
   * Handles the case where database might not be initialized yet
   */
  private getValue(key: string, configPath: string): string | undefined {
    try {
      const dbValue = this.settingsService.getSetting(key);
      if (dbValue) {
        return dbValue;
      }
    } catch {
      // Database not initialized yet, fall back to .env
      this.logger.debug(`Database not ready, using .env for ${key}`);
    }
    return this.configService.get<string>(configPath);
  }

  // ==================== Anthropic Settings ====================

  getAuthMethod(): 'api_key' | 'login' {
    const value = this.getValue('authMethod', 'anthropic.authMethod');
    return (value as 'api_key' | 'login') || 'api_key';
  }

  getModel(): 'opus' | 'sonnet' | 'haiku' {
    const value = this.getValue('model', 'anthropic.model');
    return (value as 'opus' | 'sonnet' | 'haiku') || 'sonnet';
  }

  getAnthropicApiKey(): string | undefined {
    return this.getValue('anthropicApiKey', 'anthropic.apiKey');
  }

  getAnthropicBaseUrl(): string | undefined {
    return this.getValue('anthropicBaseUrl', 'anthropic.baseUrl');
  }

  getAnthropicAuthToken(): string | undefined {
    return this.getValue('anthropicAuthToken', 'anthropic.authToken');
  }

  // ==================== Linear Settings ====================

  getLinearApiKey(): string | undefined {
    return this.getValue('linearApiKey', 'linear.apiKey');
  }

  getLinearTeamId(): string | undefined {
    return this.getValue('linearTeamId', 'linear.teamId');
  }

  getLinearWorkspace(): string | undefined {
    return this.getValue('linearWorkspace', 'linear.workspace');
  }

  // ==================== Workspace Settings ====================

  getWorkspacePath(): string | undefined {
    return this.getValue('workspacePath', 'anthropic.workspacePath');
  }
}
