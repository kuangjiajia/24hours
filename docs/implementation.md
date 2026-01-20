# Implementation Details

This document provides an in-depth technical overview of the 24Hours Automation system architecture, components, and data flow.

## Table of Contents

- [End-to-End Flow](#end-to-end-flow)
- [Core Components](#core-components)
- [Scheduler and Queue System](#scheduler-and-queue-system)
- [Claude Execution Engine](#claude-execution-engine)
- [Review and Feedback Loop](#review-and-feedback-loop)
- [Monitoring System](#monitoring-system)
- [Settings Management](#settings-management)
- [Data Persistence](#data-persistence)
- [Error Handling](#error-handling)

## End-to-End Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           TASK LIFECYCLE                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. POLL          2. LOCK           3. QUEUE          4. EXECUTE        │
│  ┌─────────┐     ┌─────────┐       ┌─────────┐       ┌─────────┐        │
│  │  Todo   │────▶│   In    │──────▶│  Bull   │──────▶│ Claude  │        │
│  │  Tasks  │     │Progress │       │  Queue  │       │   SDK   │        │
│  └─────────┘     └─────────┘       └─────────┘       └────┬────┘        │
│                                                           │              │
│                                                           ▼              │
│  5. COMPLETE                                        ┌─────────┐         │
│  ┌─────────┐     ┌─────────┐       ┌─────────┐     │ Linear  │         │
│  │  Done   │◀────│   In    │◀──────│ Review  │◀────│   MCP   │         │
│  │         │     │ Review  │       │  Check  │     └─────────┘         │
│  └─────────┘     └─────────┘       └─────────┘                         │
│       ▲                                  │                              │
│       │                                  │ No review needed             │
│       └──────────────────────────────────┘                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Detailed Steps

1. **Poll**: `TaskPollerService` runs every 30 seconds, fetching Linear issues with `Todo` status
2. **Lock**: Each issue is atomically moved to `In Progress` to prevent duplicate processing
3. **Queue**: A comment is posted and a Bull job (`execute`) is enqueued with retry configuration
4. **Execute**: `TaskProcessor` invokes `ClaudeService` which runs Claude Agent SDK
5. **Progress**: Claude posts real-time updates via Linear MCP while streaming to monitor
6. **Complete**: Task is marked `Done`, `In Review`, or `Failed` based on execution result

## Core Components

### Directory Structure

```
src/
├── app.module.ts              # Root module, imports all feature modules
├── main.ts                    # Application bootstrap
├── config/
│   └── configuration.ts       # Environment configuration schema
├── claude/
│   ├── claude.module.ts       # Claude feature module
│   ├── claude.service.ts      # Claude Agent SDK integration
│   ├── claude.controller.ts   # Session file retrieval endpoint
│   └── prompts/
│       └── task-execution.prompt.ts  # Prompt templates
├── linear/
│   ├── linear.module.ts       # Linear feature module
│   ├── linear.service.ts      # Linear SDK wrapper
│   └── linear.types.ts        # TypeScript interfaces
├── queue/
│   ├── queue.module.ts        # Bull queue configuration
│   ├── task.processor.ts      # Job handlers (execute, feedback, retry)
│   └── task.interface.ts      # Job payload interfaces
├── scheduler/
│   ├── scheduler.module.ts    # Scheduler feature module
│   ├── task-poller.service.ts # Todo task polling
│   └── review-poller.service.ts # Review feedback polling
├── monitor/
│   ├── monitor.module.ts      # Monitor feature module
│   ├── monitor.service.ts     # Task state management
│   ├── monitor.controller.ts  # REST API endpoints
│   ├── monitor.gateway.ts     # WebSocket gateway
│   └── session-store.service.ts # SQLite persistence
└── settings/
    ├── settings.module.ts     # Settings feature module
    ├── settings.service.ts    # SQLite settings storage
    ├── settings.controller.ts # Settings API endpoints
    ├── settings-provider.service.ts # Config resolution
    └── dto/
        └── settings.dto.ts    # Validation DTOs
```

### Module Dependencies

```
AppModule
├── ConfigModule (global)
├── ScheduleModule (global)
├── BullModule (Redis connection)
├── SettingsModule
│   └── SettingsProviderService (exported)
├── LinearModule
│   └── LinearService (exported)
├── ClaudeModule
│   ├── ClaudeService
│   └── ClaudeController
├── QueueModule
│   └── TaskProcessor
├── SchedulerModule
│   ├── TaskPollerService
│   └── ReviewPollerService
└── MonitorModule
    ├── MonitorService
    ├── MonitorController
    ├── MonitorGateway
    └── SessionStoreService
```

## Scheduler and Queue System

### Task Pollers

| Service | Schedule | Purpose |
|---------|----------|---------|
| `TaskPollerService` | Every 30s | Polls `Todo` tasks for execution |
| `ReviewPollerService` | Every 30s | Polls `In Review` tasks for feedback |

### Job Types

| Job Type | Trigger | Handler | Description |
|----------|---------|---------|-------------|
| `execute` | New Todo task | `handleTask()` | Initial task execution |
| `feedback` | User comment on In Review | `handleFeedback()` | Process user feedback |
| `retry` | Manual retry request | `handleRetry()` | Retry failed task |

### Job Configuration

```typescript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000  // 5s, 10s, 20s
  },
  timeout: TASK_TIMEOUT,  // Default: 3 hours
  removeOnComplete: true,
  removeOnFail: false
}
```

### Queue Events

- Jobs are processed with `@Process('jobType')` decorators
- Failed jobs trigger `@OnQueueFailed()` handler
- Progress updates are streamed via `MonitorService`

## Claude Execution Engine

### SDK Integration

```typescript
const agentQuery = query({
  prompt: taskPrompt,
  options: {
    model: 'claude-sonnet-4-5-20250929',
    systemPrompt,
    env: envVars,
    cwd: workspacePath,
    permissionMode: 'bypassPermissions',
    mcpServers: {
      linear: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', 'mcp-remote', 'https://mcp.linear.app/mcp'],
        env: { LINEAR_API_KEY: '...' }
      }
    }
  }
});
```

### Authentication Modes

| Mode | Environment Variables | Use Case |
|------|----------------------|----------|
| `login` | `ANTHROPIC_API_KEY` | Direct Anthropic API |
| `api_key` | `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN` | Proxy API |

### Message Processing

The SDK emits various message types during execution:

| Type | Purpose | Handler Action |
|------|---------|----------------|
| `system` | Session initialization | Capture `session_id` |
| `assistant` | Text and tool calls | Accumulate response, track tools |
| `tool_progress` | MCP tool progress | Log debug info |
| `result` | Final result | Check success/failure |

### Session Management

- Session IDs are extracted from `system.init` messages
- Stored in SQLite via `SessionStoreService`
- Used for feedback processing and retry operations
- Sessions can be resumed using the `resume` option

## Review and Feedback Loop

### Review Keywords

Tasks are flagged for review if title/description contains:

```typescript
const REVIEW_KEYWORDS = [
  'write', 'generate', 'create', 'send',
  'email', 'article', 'report', 'delete',
  'modify', 'update', 'code', 'script'
];
```

### Feedback Processing Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  In Review  │────▶│   Poll      │────▶│  Collect    │
│    Task     │     │  Comments   │     │  Feedback   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Update    │◀────│   Resume    │◀────│   Enqueue   │
│   Status    │     │   Session   │     │  Feedback   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Comment De-duplication

- Processed comment IDs are stored in `processed_comments` table
- Comments from the API key owner (bot) are excluded
- Multiple comments are merged into a single feedback prompt

## Monitoring System

### In-Memory State

```typescript
interface RunningTaskInfo {
  taskId: string;
  identifier: string;
  title: string;
  status: 'running';
  progress: number;
  currentStep?: string;
  steps: { step: string; timestamp: Date }[];
  startedAt: Date;
  sessionId?: string;
}
```

### WebSocket Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `task:update` | Task status, progress, duration | Task state change |
| `stats:update` | Linear status counts, queue length | Stats refresh |
| `log:new` | Timestamp, level, message | Execution log entry |

### REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/monitor/dashboard` | GET | Stats and running tasks |
| `/api/monitor/queue` | GET | Queued jobs |
| `/api/monitor/history` | GET | Recent completions |
| `/api/monitor/task/:id` | GET | Task detail |
| `/api/monitor/execution/pause` | POST | Pause queue |
| `/api/monitor/execution/resume` | POST | Resume queue |
| `/api/monitor/tasks/:id/retry` | POST | Retry failed task |

## Settings Management

### Configuration Priority

1. **SQLite database** (highest priority)
2. **Environment variables** (fallback)

### Settings Schema

| Key | Type | Description |
|-----|------|-------------|
| `LINEAR_API_KEY` | string | Linear API key |
| `LINEAR_TEAM_ID` | string | Linear team key |
| `CLAUDE_AUTH_METHOD` | enum | `login` or `api_key` |
| `ANTHROPIC_API_KEY` | string | For login mode |
| `ANTHROPIC_BASE_URL` | string | For api_key mode |
| `ANTHROPIC_AUTH_TOKEN` | string | For api_key mode |
| `CLAUDE_WORKSPACE_PATH` | string | Working directory restriction |

### Security

- Sensitive values are masked in GET responses
- Full values are only used internally
- Settings are validated before storage

## Data Persistence

### SQLite Schema

```sql
-- Task session tracking
CREATE TABLE task_sessions (
  id INTEGER PRIMARY KEY,
  linear_task_id TEXT UNIQUE,
  session_id TEXT,
  identifier TEXT,
  title TEXT,
  started_at TEXT,
  completed_at TEXT,
  success INTEGER
);

-- Comment de-duplication
CREATE TABLE processed_comments (
  id INTEGER PRIMARY KEY,
  comment_id TEXT UNIQUE,
  task_id TEXT,
  processed_at TEXT
);

-- Application settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

### File Locations

| File | Purpose |
|------|---------|
| `.claude-sessions.db` | SQLite database |
| `~/.claude/projects/*/` | Claude session logs |

## Error Handling

### Retry Strategy

| Attempt | Delay | Total Wait |
|---------|-------|------------|
| 1 | 5s | 5s |
| 2 | 10s | 15s |
| 3 | 20s | 35s |

### Failure Handling

1. Error is logged to console and Linear comment
2. Task status is set to `Failed`
3. Session is preserved for manual retry
4. Monitor broadcasts failure event

### Recovery Options

- **Automatic retry**: Built into job configuration (3 attempts)
- **Manual retry**: POST `/api/monitor/tasks/:id/retry`
- **Session resume**: Uses preserved Claude session context

## Configuration Notes

- Polling runs on fixed 30-second cron schedule
- `POLLING_INTERVAL` env var is read but not currently used at runtime
- `MAX_CONCURRENT_TASKS` is configured but Bull handles concurrency
- Task timeout defaults to 3 hours (10,800,000 ms)
