# Architecture

This document provides a comprehensive overview of the 24Hours Automation system architecture, covering the technical stack, system design, component interactions, and design rationale.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Design Principles](#design-principles)
- [Security Architecture](#security-architecture)
- [Scalability Considerations](#scalability-considerations)

## Overview

24Hours Automation is an autonomous AI-powered task execution system that bridges Linear project management with Claude AI. The system continuously monitors Linear for new tasks, executes them using Claude Agent SDK with MCP (Model Context Protocol), and provides real-time progress updates through a modern web dashboard.

### Key Characteristics

- **Event-Driven**: Tasks flow through a queue-based pipeline from discovery to completion
- **Observable**: Every action is visible through Linear comments and WebSocket-powered dashboard
- **Resilient**: Session persistence enables recovery and retry without losing context
- **Extensible**: Modular NestJS architecture supports easy customization

## Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **NestJS** | 10.x | Application framework with modular architecture |
| **TypeScript** | 5.x | Type-safe development |
| **Bull** | 4.x | Redis-backed job queue with retry support |
| **Socket.io** | 4.x | Real-time WebSocket communication |
| **better-sqlite3** | 12.x | Embedded database for local state |
| **ioredis** | 5.x | Redis client for Bull queue |

### AI & Integrations

| Technology | Purpose |
|------------|---------|
| **Claude Agent SDK** | Autonomous AI task execution |
| **Anthropic SDK** | Claude API communication |
| **Linear SDK** | Project management integration |
| **MCP (Model Context Protocol)** | Tool interface for Claude |

### Frontend

| Technology | Purpose |
|------------|---------|
| **React** | UI framework |
| **Vite** | Build tool and dev server |
| **Socket.io Client** | Real-time updates |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **Redis** | Queue persistence and pub/sub |
| **Docker** | Containerization |
| **Docker Compose** | Multi-service orchestration |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL SERVICES                               │
│  ┌─────────────┐                                        ┌─────────────┐     │
│  │   Linear    │◀──── Status Updates / Comments ────────│  Anthropic  │     │
│  │    API      │                                        │ Claude Code │     │
│  └──────┬──────┘                                        └──────▲──────┘     │
│         │                                                      │            │
└─────────┼──────────────────────────────────────────────────────┼────────────┘
          │ Poll Tasks                                   Execute Tasks
          ▼                                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION LAYER                               │
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌───────────┐ │
│  │  Scheduler  │────▶│    Queue    │────▶│   Claude    │────▶│  Monitor  │ │
│  │   Module    │     │   Module    │     │   Module    │     │   Module  │ │
│  └─────────────┘     └─────────────┘     └─────────────┘     └─────┬─────┘ │
│         │                   │                   │                   │       │
│         │                   │                   │                   │       │
│         ▼                   ▼                   ▼                   ▼       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Settings Module                               │   │
│  │                   (Configuration Resolution)                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PERSISTENCE LAYER                               │
│                                                                              │
│  ┌─────────────────────────┐          ┌─────────────────────────┐          │
│  │         Redis           │          │         SQLite          │          │
│  │  • Job Queue Storage    │          │  • Session Metadata     │          │
│  │  • Retry State          │          │  • Processed Comments   │          │
│  │  • Pub/Sub Events       │          │  • Application Settings │          │
│  └─────────────────────────┘          └─────────────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      React Dashboard (Vite)                          │   │
│  │  • Real-time Task Monitoring    • Settings Configuration            │   │
│  │  • Execution History            • Manual Controls (Pause/Retry)     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Scheduler Module (`src/scheduler/`)

Responsible for discovering and initiating task processing.

| Service | Schedule | Responsibility |
|---------|----------|----------------|
| `TaskPollerService` | Every 30s | Poll Linear for `Todo` tasks |
| `ReviewPollerService` | Every 30s | Poll `In Review` tasks for feedback |

**Design Decision**: Polling over webhooks was chosen for simplicity and reliability. The 30-second latency is acceptable for automation use cases, and polling doesn't require a public HTTPS endpoint.

### 2. Queue Module (`src/queue/`)

Manages task execution lifecycle with reliability guarantees.

| Component | Purpose |
|-----------|---------|
| `QueueModule` | Bull queue configuration with Redis |
| `TaskProcessor` | Job handlers for execute, feedback, retry |

**Job Types**:
- `execute`: Initial task execution from Todo
- `feedback`: Process user comments on In Review tasks
- `retry`: Manual retry of failed tasks

**Retry Configuration**:
```
Attempts: 3
Backoff: Exponential (5s → 10s → 20s)
Timeout: 3 hours
```

### 3. Claude Module (`src/claude/`)

Integrates with Claude Agent SDK for autonomous task execution.

| Component | Purpose |
|-----------|---------|
| `ClaudeService` | SDK integration, session management |
| `ClaudeController` | Session file retrieval endpoint |
| `prompts/` | Task execution prompt templates |

**Key Features**:
- MCP integration for Linear tool access
- Session persistence for context preservation
- Dual authentication modes (direct API / proxy)
- Workspace path restriction for security

### 4. Linear Module (`src/linear/`)

Wraps Linear SDK for task and comment management.

| Component | Purpose |
|-----------|---------|
| `LinearService` | Task CRUD, status updates, comments |
| `linear.types.ts` | TypeScript interfaces |

**Status Mapping**:
| Status | Meaning |
|--------|---------|
| `Todo` | Pending execution |
| `In Progress` | Currently executing |
| `In Review` | Awaiting human approval |
| `Done` | Completed successfully |
| `Failed` | Execution failed |

### 5. Monitor Module (`src/monitor/`)

Provides observability through REST API and WebSocket.

| Component | Purpose |
|-----------|---------|
| `MonitorService` | Task state management, stats |
| `MonitorController` | REST API endpoints |
| `MonitorGateway` | WebSocket event broadcasting |
| `SessionStoreService` | SQLite persistence layer |

**WebSocket Events**:
| Event | Trigger |
|-------|---------|
| `task:update` | Task status/progress change |
| `stats:update` | Dashboard stats refresh |
| `log:new` | New execution log entry |

### 6. Settings Module (`src/settings/`)

Manages application configuration with priority resolution.

| Component | Purpose |
|-----------|---------|
| `SettingsService` | SQLite settings storage |
| `SettingsProviderService` | Config resolution (DB → ENV) |
| `SettingsController` | Settings API endpoints |

**Configuration Priority**:
1. SQLite database (highest)
2. Environment variables (fallback)

## Data Flow

### Task Execution Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           TASK LIFECYCLE                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. DISCOVER       2. LOCK           3. QUEUE          4. EXECUTE       │
│  ┌─────────┐      ┌─────────┐       ┌─────────┐       ┌─────────┐       │
│  │  Poll   │─────▶│   Set   │──────▶│  Add    │──────▶│  Run    │       │
│  │  Todo   │      │  In Prg │       │  Job    │       │ Claude  │       │
│  └─────────┘      └─────────┘       └─────────┘       └────┬────┘       │
│                                                             │            │
│                                                             ▼            │
│  6. COMPLETE                                          ┌─────────┐       │
│  ┌─────────┐      ┌─────────┐       ┌─────────┐      │ Stream  │       │
│  │  Done   │◀─────│   In    │◀──────│ Review  │◀─────│Progress │       │
│  │   or    │      │ Review  │       │  Gate   │      └─────────┘       │
│  │ Failed  │      └─────────┘       └─────────┘                        │
│  └─────────┘           ▲                                               │
│                        │ 5. FEEDBACK                                    │
│                   ┌─────────┐                                          │
│                   │  User   │                                          │
│                   │Comment  │                                          │
│                   └─────────┘                                          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Feedback Processing Flow

```
In Review Task → Poll Comments → Filter New → Enqueue Feedback Job
                                                      ↓
                     Update Status ← Resume Session ← Process with Claude
```

## Design Principles

### 1. Human in the Loop

AI automation augments human capabilities rather than replacing human judgment.

- **Review Gate**: Tasks with keywords (`write`, `create`, `code`, etc.) require human approval
- **Auditable**: All approvals are recorded in Linear comments
- **Gradual Trust**: Users can approve or reject AI outputs

### 2. Linear as Source of Truth

External project management tool owns canonical state.

- Task lifecycle state lives in Linear
- Local SQLite only caches execution metadata
- System can restart without losing task state

### 3. Observable Automation

Every action is visible without diving into logs.

- Real-time progress via Linear comments
- WebSocket dashboard updates
- REST endpoints for programmatic access

### 4. Recoverable and Resumable

Failures don't require starting from scratch.

- Session IDs persisted for context preservation
- Failed tasks can be retried with previous context
- Exponential backoff prevents cascading failures

### 5. Minimal Infrastructure

Low operational complexity with embedded storage.

- Redis for queue (can use managed service)
- SQLite for local state (zero configuration)
- Docker Compose for easy deployment

## Security Architecture

### Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                      UNTRUSTED ZONE                              │
│  ┌─────────┐                                                    │
│  │ Linear  │  Task content from external users                  │
│  │ Issues  │  May contain adversarial prompts                   │
│  └────┬────┘                                                    │
└───────┼─────────────────────────────────────────────────────────┘
        │
        ▼
┌───────┴─────────────────────────────────────────────────────────┐
│                      PROCESSING ZONE                             │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐                   │
│  │ Poller  │────▶│  Queue  │────▶│ Claude  │                   │
│  └─────────┘     └─────────┘     └────┬────┘                   │
│                                       │                         │
│                              Workspace Restriction              │
└───────────────────────────────────────┼─────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────┴─────────────────────────┐
│                      TRUSTED ZONE                                │
│  ┌─────────┐     ┌─────────┐                                    │
│  │ SQLite  │     │  Redis  │  Internal state only               │
│  └─────────┘     └─────────┘                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Credential Management

- API keys stored in SQLite with masked GET responses
- Environment variables as secure fallback
- No credentials in logs or error messages
- Session tokens are opaque identifiers

### Safety Boundaries

- Claude subprocess restricted to configured workspace directory
- MCP integration limits Claude to Linear-specific actions
- Permission bypass is intentional and documented
- Review gate prevents unintended AI-generated content

## Scalability Considerations

### Current Design

- Single-instance deployment
- Bull queue with configurable concurrency
- SQLite for low-volume local state

### Scaling Strategies

| Component | Horizontal Scaling | Notes |
|-----------|-------------------|-------|
| Backend | ✅ Possible | Stateless design, shared Redis/SQLite |
| Queue Workers | ✅ Possible | Bull supports distributed workers |
| SQLite | ⚠️ Limited | Consider PostgreSQL for high volume |
| Dashboard | ✅ Possible | Static assets, WebSocket load balancing |

### Performance Tuning

| Parameter | Default | Tunable Via |
|-----------|---------|-------------|
| Polling Interval | 30s | Cron schedule in poller services |
| Concurrent Tasks | 3 | `MAX_CONCURRENT_TASKS` env var |
| Task Timeout | 3 hours | `TASK_TIMEOUT` env var |
| Retry Attempts | 3 | Job configuration in queue module |

---

## Related Documentation

- [Implementation Details](implementation.md) - Component deep-dive and code structure
- [Design Philosophy](design-philosophy.md) - Architectural decisions and trade-offs
- [Deployment Guide](DEPLOYMENT.md) - Production deployment instructions
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions
