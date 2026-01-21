export default () => ({
  linear: {
    apiKey: process.env.LINEAR_API_KEY,
    teamId: process.env.LINEAR_TEAM_ID,
    workspace: process.env.LINEAR_WORKSPACE,
  },
  anthropic: {
    // Authentication method: 'api_key' (proxy) or 'login' (standard Anthropic)
    authMethod: process.env.CLAUDE_AUTH_METHOD || 'api_key',
    // For 'login' mode: Standard Anthropic API key
    apiKey: process.env.ANTHROPIC_API_KEY,
    // For 'api_key' mode: Proxy API configuration
    baseUrl: process.env.ANTHROPIC_BASE_URL,
    authToken: process.env.ANTHROPIC_AUTH_TOKEN,
    // Workspace path: restrict Claude to work only in this directory
    workspacePath: process.env.CLAUDE_WORKSPACE_PATH,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  app: {
    pollingInterval: parseInt(process.env.POLLING_INTERVAL || '30000', 10),
    taskTimeout: parseInt(process.env.TASK_TIMEOUT || '10800000', 10),
    maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '3', 10),
  },
});
