import type { Settings } from '../types';

export type SettingsGroup = 'anthropic' | 'linear' | 'model' | 'workspace';

export type FieldType = 'text' | 'password' | 'dropdown';

export interface DropdownOption {
  value: string;
  label: string;
}

export interface SettingsFieldConfig {
  key: keyof Settings;
  label: string;
  tooltip: string;
  type: FieldType;
  group: SettingsGroup;
  placeholder?: string;
  options?: DropdownOption[];
  visibleWhen?: {
    field: keyof Settings;
    values: string[];
  };
}

export const SETTINGS_FIELDS: SettingsFieldConfig[] = [
  // Model settings group
  {
    key: 'authMethod',
    label: 'Auth Method',
    tooltip: 'Authentication method for Anthropic API. "API Key" uses proxy billing, "Login" uses direct Anthropic API.',
    type: 'dropdown',
    group: 'model',
    options: [
      { value: 'api_key', label: 'API Key (Proxy)' },
      { value: 'login', label: 'Login (Direct)' },
    ],
  },
  {
    key: 'model',
    label: 'Model',
    tooltip: 'Claude model to use for task execution. Opus is most capable, Haiku is fastest.',
    type: 'dropdown',
    group: 'model',
    options: [
      { value: 'opus', label: 'Opus (Most Capable)' },
      { value: 'sonnet', label: 'Sonnet (Balanced)' },
      { value: 'haiku', label: 'Haiku (Fastest)' },
    ],
  },

  // Anthropic settings group
  {
    key: 'anthropicApiKey',
    label: 'Anthropic API Key',
    tooltip: 'Your Anthropic API key for direct API access (ANTHROPIC_API_KEY). Used when Auth Method is "Login".',
    type: 'password',
    group: 'anthropic',
    placeholder: 'sk-ant-xxx...',
  },
  {
    key: 'anthropicBaseUrl',
    label: 'Base URL',
    tooltip: 'Proxy API base URL. Required when Auth Method is "API Key".',
    type: 'text',
    group: 'anthropic',
    placeholder: 'https://api.proxy.com/v1',
    visibleWhen: {
      field: 'authMethod',
      values: ['api_key'],
    },
  },
  {
    key: 'anthropicAuthToken',
    label: 'Auth Token',
    tooltip: 'Proxy API authentication token. Required when Auth Method is "API Key".',
    type: 'password',
    group: 'anthropic',
    placeholder: 'your-auth-token...',
    visibleWhen: {
      field: 'authMethod',
      values: ['api_key'],
    },
  },

  // Linear settings group
  {
    key: 'linearApiKey',
    label: 'Linear API Key',
    tooltip: 'Your Linear API key for accessing Linear tasks and comments.',
    type: 'password',
    group: 'linear',
    placeholder: 'lin_api_xxx...',
  },
  {
    key: 'linearTeamId',
    label: 'Team ID',
    tooltip: 'Linear team ID to filter tasks. Leave empty to show all teams.',
    type: 'text',
    group: 'linear',
    placeholder: 'TEAM-123',
  },
  {
    key: 'linearWorkspace',
    label: 'Workspace',
    tooltip: 'Linear workspace name or slug for identification.',
    type: 'text',
    group: 'linear',
    placeholder: 'my-workspace',
  },
  {
    key: 'linearApiKeyName',
    label: 'API Key Name',
    tooltip: 'A friendly name for this Linear API key (for reference only).',
    type: 'text',
    group: 'linear',
    placeholder: 'My Linear Key',
  },

  // Workspace settings group
  {
    key: 'workspacePath',
    label: 'Workspace Path',
    tooltip: 'The root directory where Claude will execute tasks. This restricts Claude to this directory.',
    type: 'text',
    group: 'workspace',
    placeholder: '/path/to/your/project',
  },
];

export const GROUP_LABELS: Record<SettingsGroup, string> = {
  model: 'Model Settings',
  anthropic: 'Anthropic API',
  linear: 'Linear Integration',
  workspace: 'Workspace',
};

export const GROUP_ORDER: SettingsGroup[] = ['model', 'anthropic', 'linear', 'workspace'];
