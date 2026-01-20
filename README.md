# 24Hours Automation

<p align="center">
  <strong>Autonomous AI-powered task execution system with Linear integration</strong>
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#configuration">Configuration</a> &bull;
  <a href="#api-reference">API Reference</a>
</p>

---

24Hours Automation is a production-ready system that bridges Linear project management with Claude AI to autonomously execute tasks around the clock. It monitors your Linear board, picks up new tasks, executes them using Claude Agent SDK with MCP (Model Context Protocol), and reports real-time progress through Linear comments.

## Features

- **Autonomous Execution** - Polls Linear for "Todo" tasks every 30 seconds and executes them automatically
- **Real-time Progress** - Posts live updates as Linear comments during task execution
- **Human Review Workflow** - Tasks involving content creation, code, or critical operations are set to "In Review" for human approval
- **Session Persistence** - Maintains Claude session context in SQLite for feedback processing and retries
- **Live Dashboard** - React-based monitoring UI with WebSocket real-time updates
- **Flexible Auth** - Supports both direct Anthropic API and proxy API configurations
- **Docker Ready** - Full Docker Compose setup for production deployment

## Architecture

```
┌─────────────┐      poll Todo      ┌─────────────┐    enqueue    ┌─────────────┐
│   Linear    │ ─────────────────▶  │   Poller    │ ────────────▶ │ Bull/Redis  │
│    API      │                     │   (Cron)    │               └──────┬──────┘
└──────┬──────┘                     └─────────────┘                      │
       │                                                                 │
       │ MCP comments/status                                             ▼
       │                                                          ┌─────────────┐
       │                                                          │    Task     │
       │                                                          │  Processor  │
       │                                                          └──────┬──────┘
       │                                                                 │
       │                                                                 ▼
┌──────┴──────┐                                                   ┌─────────────┐
│   Claude    │ ◀──────────────────────────────────────────────── │ Claude SDK  │
│   Agent     │              session reuse / feedback             └─────────────┘
└──────┬──────┘
       │
       │ WS/REST updates
       ▼
┌─────────────┐         settings + sessions          ┌─────────────────────┐
│  Monitor    │ ───────────────────────────────────▶ │ SQLite              │
│  API/WS     │                                      │ (.claude-sessions.db)│
└──────┬──────┘                                      └─────────────────────┘
       │
       ▼
┌─────────────┐
│   Web UI    │
│  Dashboard  │
└─────────────┘
```

## Repository Structure

```
├── src/                    # NestJS backend
│   ├── claude/            # Claude AI integration & prompts
│   ├── linear/            # Linear API service
│   ├── monitor/           # Dashboard API & WebSocket gateway
│   ├── queue/             # Bull queue & task processor
│   ├── scheduler/         # Task polling services
│   └── settings/          # Configuration management
├── frontend/              # Vite + React dashboard
├── scripts/               # Helper scripts
├── docs/                  # Documentation
└── docker-compose.yml     # Docker orchestration
```

## Quick Start

### Prerequisites

- Node.js 20+
- Redis 7+
- Linear API key and team key
- Anthropic API key (or proxy credentials)

### Local Development

1. **Clone and install**
```bash
git clone https://github.com/yourusername/24hours-automation.git
cd 24hours-automation
npm install
cd frontend && npm install && cd ..
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your Redis configuration
```

3. **Start Redis**
```bash
redis-server
```

4. **Start backend**
```bash
npm run start:dev
```

5. **Start frontend** (new terminal)
```bash
cd frontend && npm run dev
```

6. **Access dashboard** at `http://localhost:5173`

### Docker Deployment

```bash
docker compose up --build
```

- Backend: `http://localhost:3000`
- Dashboard: `http://localhost:8080`

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis server host | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `POLLING_INTERVAL` | Task poll interval (ms) | `30000` |
| `TASK_TIMEOUT` | Execution timeout (ms) | `10800000` |
| `MAX_CONCURRENT_TASKS` | Concurrent task limit | `3` |

### Application Settings

Configure via the dashboard **Settings** panel:

| Setting | Description |
|---------|-------------|
| Linear API Key | Your Linear API key |
| Linear Team ID | Team key (e.g., "TEAM") |
| Auth Mode | `login` (Anthropic API) or `api_key` (Proxy API) |
| Anthropic API Key | Required for `login` mode |
| Anthropic Base URL | Required for `api_key` mode |
| Anthropic Auth Token | Required for `api_key` mode |
| Workspace Path | Optional path to restrict Claude file access |

Settings are stored in SQLite and take precedence over environment variables.

## Task Workflow

1. **Create** - Create issue in Linear with "Todo" status
2. **Pickup** - System polls and picks up new tasks
3. **Execute** - Claude AI executes using MCP tools
4. **Progress** - Real-time updates posted as comments
5. **Complete** - Status set to "Done" or "In Review"

### Status Mapping

| Status | Description |
|--------|-------------|
| `Todo` | Pending execution |
| `In Progress` | Currently executing |
| `In Review` | Awaiting human approval |
| `Done` | Completed successfully |
| `Failed` | Execution failed |

## API Reference

### Monitor Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/monitor/dashboard` | Dashboard statistics |
| `GET` | `/api/monitor/queue` | Queued tasks |
| `GET` | `/api/monitor/history` | Execution history |
| `POST` | `/api/monitor/execution/pause` | Pause execution |
| `POST` | `/api/monitor/execution/resume` | Resume execution |
| `POST` | `/api/monitor/tasks/:taskId/retry` | Retry failed task |

### Settings Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings` | Get current settings |
| `POST` | `/api/settings` | Update settings |

### Linear Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/monitor/linear/tasks` | All tasks |
| `GET` | `/api/linear/tasks/status/:status` | Tasks by status |
| `GET` | `/api/linear/issue/:id` | Issue with comments |

### WebSocket Events

Namespace: `/monitor`

| Event | Description |
|-------|-------------|
| `task:update` | Task status/progress update |
| `stats:update` | Dashboard stats update |
| `log:new` | New execution log entry |

## Development

### Build for Production

```bash
# Backend
npm run build

# Frontend
cd frontend && npm run build
```

### Run Tests

```bash
npm test
```

### Helper Scripts

```bash
# Create test task
npx ts-node scripts/create-test-task.ts

# Quick verification
./scripts/quick-verify.sh

# Cleanup test data
npx ts-node scripts/cleanup-test-data.ts
```

## Documentation

- [Implementation Details](docs/implementation.md) - Technical architecture and component overview
- [Design Philosophy](docs/design-philosophy.md) - Core principles and architectural decisions
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Contributing](CONTRIBUTING.md) - Contribution guidelines

## Notes

- Session metadata stored in `.claude-sessions.db`
- Claude sessions are preserved for feedback and retry operations
- Review gate triggers for keywords: `write`, `generate`, `create`, `send`, `code`, `script`, etc.

## License

MIT License

## Acknowledgments

- [Anthropic](https://anthropic.com) - Claude AI & Agent SDK
- [Linear](https://linear.app) - Project Management
- [NestJS](https://nestjs.com) - Backend Framework
- [Vite](https://vitejs.dev) + [React](https://react.dev) - Frontend
