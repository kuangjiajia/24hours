import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SettingsDto {
  // Model settings
  @IsNotEmpty()
  @IsEnum(['api_key', 'login'], {
    message: 'authMethod must be either api_key or login',
  })
  authMethod: 'api_key' | 'login';

  @IsNotEmpty()
  @IsEnum(['opus', 'sonnet', 'haiku'], {
    message: 'model must be either opus, sonnet, or haiku',
  })
  model: 'opus' | 'sonnet' | 'haiku';

  // Anthropic settings
  @IsOptional()
  @IsString()
  anthropicApiKey?: string;

  @IsOptional()
  @IsString()
  anthropicBaseUrl?: string;

  @IsOptional()
  @IsString()
  anthropicAuthToken?: string;

  // Linear settings
  @IsOptional()
  @IsString()
  linearApiKey?: string;

  @IsOptional()
  @IsString()
  linearTeamId?: string;

  @IsOptional()
  @IsString()
  linearWorkspace?: string;

  @IsOptional()
  @IsString()
  linearApiKeyName?: string;

  // Workspace settings
  @IsOptional()
  @IsString()
  workspacePath?: string;
}
