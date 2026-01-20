# Design Philosophy

This document outlines the core principles and architectural decisions that guide the 24Hours Automation system design.

## Table of Contents

- [Core Principles](#core-principles)
- [Architectural Decisions](#architectural-decisions)
- [Trade-offs](#trade-offs)
- [Security Model](#security-model)
- [Extensibility](#extensibility)

## Core Principles

### 1. Human in the Loop by Default

AI automation should augment human capabilities, not replace human judgment for critical decisions.

**Implementation:**
- Tasks involving content creation, code, or critical operations are automatically routed to `In Review` status
- Review keywords trigger human oversight: `write`, `generate`, `create`, `send`, `code`, `script`, etc.
- The review loop is explicit and tied to Linear comments, making approvals auditable
- Users can approve, request changes, or cancel tasks through Linear's familiar interface

**Rationale:**
- Prevents unintended consequences from AI-generated content
- Maintains accountability and traceability
- Allows gradual trust building with the automation system

### 2. Linear as Source of Truth

The external project management tool owns the canonical state; local storage is ephemeral.

**Implementation:**
- Task lifecycle state (Todo, In Progress, In Review, Done, Failed) lives in Linear
- Local SQLite only caches metadata needed for execution (session IDs, processed comments)
- All progress and status updates are posted to Linear as comments
- System can be restarted without losing task state

**Rationale:**
- Avoids state synchronization complexity
- Provides single source of truth for auditing
- Leverages Linear's existing notification and permission systems
- Team members can interact with tasks even when automation is down

### 3. Observable Automation

Every action should be visible and traceable without diving into logs.

**Implementation:**
- Real-time progress posted as Linear comments during execution
- WebSocket broadcasts enable live dashboard updates
- REST endpoints expose execution state without requiring log access
- Session IDs link execution artifacts for debugging

**Rationale:**
- Builds trust through transparency
- Enables debugging without SSH access
- Supports compliance and audit requirements
- Reduces operational burden

### 4. Recoverable and Resumable

Failures should not require starting from scratch.

**Implementation:**
- Claude session IDs are persisted to SQLite
- Failed tasks can be retried with previous context preserved
- Feedback processing resumes existing sessions instead of creating new ones
- Exponential backoff prevents cascading failures

**Rationale:**
- Long-running tasks are expensive to restart
- Context preservation improves retry success rates
- Reduces token usage and API costs
- Better user experience during transient failures

### 5. Minimal Infrastructure

Keep operational complexity low; prefer managed services and embedded storage.

**Implementation:**
- Redis for queue management (can use managed Redis)
- SQLite for local state (zero configuration, file-based)
- Stateless application design allows horizontal scaling
- Docker Compose for easy deployment

**Rationale:**
- Reduces DevOps overhead
- Easier local development
- Lower operational costs
- Faster onboarding for new team members

### 6. Safety Boundaries

Constrain AI capabilities to prevent unintended access or actions.

**Implementation:**
- Claude subprocess can be restricted to a specific workspace directory
- Settings are centralized and API keys are masked in responses
- MCP integration limits Claude to Linear-specific actions
- Permission bypass is intentional and documented

**Rationale:**
- Defense in depth against prompt injection
- Limits blast radius of potential issues
- Supports compliance requirements
- Clear security model for auditing

## Architectural Decisions

### Why NestJS?

- **Modular architecture**: Clear separation of concerns with feature modules
- **Dependency injection**: Testable and maintainable code
- **Built-in support**: WebSocket, scheduling, validation out of the box
- **TypeScript first**: Strong typing for reliability

### Why Bull Queue?

- **Redis-backed**: Reliable, persistent job storage
- **Retry support**: Built-in exponential backoff
- **Concurrency control**: Configurable worker limits
- **Observable**: Events for monitoring job lifecycle

### Why SQLite?

- **Zero configuration**: No separate database server needed
- **Embedded**: Ships with the application
- **Sufficient**: Local state is small and read-heavy
- **Portable**: Easy backup and migration

### Why WebSocket over Polling?

- **Real-time**: Instant updates without client polling
- **Efficient**: Reduces server load vs. frequent HTTP requests
- **Scalable**: Socket.io handles connection management
- **User experience**: Smooth, responsive dashboard

### Why Linear MCP over Direct API?

- **Context preservation**: Claude maintains conversation context with Linear
- **Native integration**: Claude can read and write without custom code
- **Future proof**: MCP protocol is expanding to more tools
- **Simplified prompts**: Claude understands Linear's data model

## Trade-offs

### Polling vs. Webhooks

**Current**: Polling every 30 seconds
**Alternative**: Linear webhooks

| Aspect | Polling | Webhooks |
|--------|---------|----------|
| Latency | Up to 30s delay | Near-instant |
| Complexity | Simple | Requires public endpoint |
| Reliability | Very reliable | Depends on delivery |
| Infrastructure | No requirements | Needs HTTPS endpoint |

**Decision**: Polling chosen for simplicity and reliability. 30-second latency is acceptable for task automation use case.

### Session Persistence vs. Stateless

**Current**: Persist session IDs for resume capability
**Alternative**: Stateless execution

| Aspect | Stateful | Stateless |
|--------|----------|-----------|
| Resume capability | Yes | No |
| Storage overhead | SQLite file | None |
| Complexity | Moderate | Simple |
| Retry quality | Better | Worse |

**Decision**: Stateful chosen because resume capability significantly improves retry success and reduces API costs.

### Review Gate vs. Always Auto-complete

**Current**: Keyword-based review gate
**Alternative**: Complete all tasks automatically

| Aspect | Review Gate | Auto-complete |
|--------|-------------|---------------|
| Safety | Higher | Lower |
| Speed | Slower | Faster |
| User involvement | Required | Optional |
| Risk tolerance | Lower | Higher |

**Decision**: Review gate chosen because AI output for content and code should have human oversight. Can be disabled by avoiding trigger keywords.

## Security Model

### Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                      UNTRUSTED ZONE                          │
│  ┌─────────┐                                                │
│  │ Linear  │  Task content from external users              │
│  │ Issues  │  May contain adversarial prompts               │
│  └────┬────┘                                                │
└───────┼─────────────────────────────────────────────────────┘
        │
        ▼
┌───────┴─────────────────────────────────────────────────────┐
│                      PROCESSING ZONE                         │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐               │
│  │ Poller  │────▶│  Queue  │────▶│ Claude  │               │
│  └─────────┘     └─────────┘     └────┬────┘               │
│                                       │                     │
│                              Workspace restriction          │
└───────────────────────────────────────┼─────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────┴─────────────────────┐
│                      TRUSTED ZONE                            │
│  ┌─────────┐     ┌─────────┐                                │
│  │ SQLite  │     │  Redis  │  Internal state only           │
│  └─────────┘     └─────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

### Credential Management

- API keys stored in SQLite with masked GET responses
- Environment variables as fallback
- No credentials in logs or error messages
- Session tokens are opaque identifiers

### Input Sanitization

- Task content passed to Claude as-is (Claude handles its own safety)
- Linear API responses are validated by SDK
- Settings are validated via class-validator DTOs

## Extensibility

### Adding New Task Sources

The system can be extended to poll from other sources:

1. Create new poller service in `src/scheduler/`
2. Implement source-specific API client
3. Convert source items to `LinearTask` interface
4. Enqueue jobs with appropriate job type

### Adding New MCP Tools

Claude can be given additional capabilities:

1. Add MCP server configuration to `ClaudeService`
2. Update prompts to describe new tool capabilities
3. Handle tool-specific output in message processor

### Custom Review Logic

Review gates can be customized:

1. Modify `REVIEW_KEYWORDS` in `TaskProcessor`
2. Add additional checks (e.g., priority-based, label-based)
3. Implement custom review status mapping

### Dashboard Extensions

The monitoring dashboard can be extended:

1. Add new WebSocket events in `MonitorGateway`
2. Create new REST endpoints in `MonitorController`
3. Build corresponding frontend components
