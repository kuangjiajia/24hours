import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';
import { SettingsDto } from './dto/settings.dto';

// Mapping of setting keys to their config paths for .env fallback
const settingsConfig: Record<string, string> = {
  authMethod: 'anthropic.authMethod',
  model: 'anthropic.model',
  anthropicApiKey: 'anthropic.apiKey',
  anthropicBaseUrl: 'anthropic.baseUrl',
  anthropicAuthToken: 'anthropic.authToken',
  linearApiKey: 'linear.apiKey',
  linearTeamId: 'linear.teamId',
  linearWorkspace: 'linear.workspace',
  linearApiKeyName: 'linear.apiKeyName',
  workspacePath: 'anthropic.workspacePath',
};

// List of sensitive fields that should be masked
const sensitiveFields = [
  'anthropicApiKey',
  'anthropicAuthToken',
  'linearApiKey',
];

@Controller('api/settings')
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Mask sensitive value: show first 4 and last 4 characters
   */
  private maskSensitiveValue(value: string | undefined | null): string {
    if (!value) return '';
    if (value.length <= 8) return '****';
    return `${value.slice(0, 4)}***${value.slice(-4)}`;
  }

  /**
   * Check if a value contains the mask pattern (meaning it wasn't changed)
   */
  private isMaskedValue(value: string | undefined): boolean {
    return !!value && value.includes('***');
  }

  /**
   * GET /api/settings
   * Returns current settings from database, or defaults from .env if not set
   * Sensitive fields are masked
   */
  @Get()
  getSettings(): SettingsDto {
    const savedSettings = this.settingsService.getAllSettings();
    const result: Record<string, string | undefined> = {};

    // For each setting, use saved value or fall back to .env
    for (const [key, configPath] of Object.entries(settingsConfig)) {
      const savedValue = savedSettings[key];
      const envValue = this.configService.get<string>(configPath);
      let value = savedValue || envValue || '';

      // Mask sensitive fields
      if (sensitiveFields.includes(key) && value) {
        value = this.maskSensitiveValue(value);
      }

      result[key] = value;
    }

    this.logger.debug(`Retrieved settings: ${JSON.stringify(Object.keys(result))}`);

    return {
      authMethod: (result.authMethod as 'api_key' | 'login') || 'api_key',
      model: (result.model as 'opus' | 'sonnet' | 'haiku') || 'sonnet',
      anthropicApiKey: result.anthropicApiKey,
      anthropicBaseUrl: result.anthropicBaseUrl,
      anthropicAuthToken: result.anthropicAuthToken,
      linearApiKey: result.linearApiKey,
      linearTeamId: result.linearTeamId,
      linearWorkspace: result.linearWorkspace,
      linearApiKeyName: result.linearApiKeyName,
      workspacePath: result.workspacePath,
    };
  }

  /**
   * POST /api/settings
   * Save settings to database
   * Skip updating sensitive fields if they contain the mask pattern
   */
  @Post()
  saveSettings(@Body() settingsDto: SettingsDto): SettingsDto {
    this.logger.log(`Saving settings...`);

    const settingsToSave: Record<string, string> = {};

    // Process each field
    for (const key of Object.keys(settingsConfig)) {
      const value = settingsDto[key as keyof SettingsDto];

      // Skip undefined values
      if (value === undefined) continue;

      // For sensitive fields, skip if the value contains the mask pattern
      if (sensitiveFields.includes(key) && this.isMaskedValue(value as string)) {
        this.logger.debug(`Skipping masked sensitive field: ${key}`);
        continue;
      }

      settingsToSave[key] = value as string;
    }

    this.settingsService.setSettings(settingsToSave);

    // Return the current settings (with masked values)
    return this.getSettings();
  }
}
