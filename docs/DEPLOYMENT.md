# Deployment Guide

This guide covers deployment options for 24Hours Automation, from local development to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Environment Configuration](#environment-configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup and Recovery](#backup-and-recovery)
- [Scaling](#scaling)

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20+ | Runtime environment |
| npm | 10+ | Package manager |
| Redis | 7+ | Job queue storage |
| Docker | 24+ | Containerization (optional) |
| Docker Compose | 2+ | Multi-container orchestration (optional) |

### Required Accounts

| Service | Purpose | Where to Get |
|---------|---------|--------------|
| Linear | Task management | [linear.app](https://linear.app) |
| Anthropic | Claude AI API | [console.anthropic.com](https://console.anthropic.com) |

### API Keys

1. **Linear API Key**
   - Go to Linear Settings → API → Personal API keys
   - Create a new key with read/write access
   - Note your team key (e.g., "TEAM")

2. **Anthropic API Key**
   - Go to Anthropic Console → API Keys
   - Create a new key
   - Or configure proxy API credentials

## Local Development

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/24hours-automation.git
cd 24hours-automation
```

### Step 2: Install Dependencies

```bash
# Backend
npm install

# Frontend
cd frontend && npm install && cd ..
```

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional overrides
POLLING_INTERVAL=30000
TASK_TIMEOUT=10800000
MAX_CONCURRENT_TASKS=3
```

### Step 4: Start Redis

```bash
# macOS with Homebrew
brew services start redis

# Linux
sudo systemctl start redis

# Or run directly
redis-server
```

### Step 5: Start Services

```bash
# Terminal 1: Backend
npm run start:dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Step 6: Configure Settings

1. Open dashboard at `http://localhost:5173`
2. Click **Settings** in sidebar
3. Enter Linear and Anthropic credentials
4. Save settings

## Docker Deployment

### Quick Start

```bash
docker compose up -d
```

This starts:
- Backend on port 3000
- Frontend on port 8080
- Redis on port 6379

### Custom Configuration

Create `docker-compose.override.yml`:

```yaml
version: '3.8'

services:
  task-automation:
    environment:
      - POLLING_INTERVAL=60000
      - TASK_TIMEOUT=7200000
    volumes:
      - ./custom-workspace:/workspace
```

### Build and Run

```bash
# Build images
docker compose build

# Start services
docker compose up -d

# View logs
docker compose logs -f task-automation

# Stop services
docker compose down
```

### Data Persistence

Docker volumes preserve data:

| Volume | Purpose |
|--------|---------|
| `redis-data` | Queue jobs and state |
| `./logs` | Application logs |
| `.claude-sessions.db` | Session metadata |

## Production Deployment

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer                            │
│                    (nginx/Cloudflare)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│    Frontend     │     │    Backend      │
│  (Static CDN)   │     │   (Container)   │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
          ┌─────────────────┐       ┌─────────────────┐
          │  Redis Cluster  │       │     SQLite      │
          │   (Managed)     │       │   (Persistent)  │
          └─────────────────┘       └─────────────────┘
```

### Deployment Options

#### Option 1: VPS / Cloud VM

1. Provision VM (4GB+ RAM recommended)
2. Install Docker and Docker Compose
3. Clone repository
4. Configure environment
5. Run `docker compose up -d`

#### Option 2: Container Platform

**Kubernetes:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: 24hours-automation
spec:
  replicas: 1
  selector:
    matchLabels:
      app: 24hours-automation
  template:
    metadata:
      labels:
        app: 24hours-automation
    spec:
      containers:
      - name: backend
        image: 24hours-automation:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: 24hours-secrets
        volumeMounts:
        - name: data
          mountPath: /app/.claude-sessions.db
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: 24hours-data
```

#### Option 3: Platform as a Service

**Railway / Render / Fly.io:**
1. Connect GitHub repository
2. Configure build command: `npm run build`
3. Configure start command: `npm run start:prod`
4. Add Redis add-on
5. Set environment variables

### SSL/TLS Configuration

For production, always use HTTPS:

**Nginx reverse proxy:**
```nginx
server {
    listen 443 ssl http2;
    server_name automation.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/automation.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/automation.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REDIS_HOST` | Redis server hostname | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `3000` |
| `POLLING_INTERVAL` | Task poll interval (ms) | `30000` |
| `TASK_TIMEOUT` | Execution timeout (ms) | `10800000` |
| `MAX_CONCURRENT_TASKS` | Concurrent limit | `3` |

### Application Settings

Configure via dashboard or API:

```bash
# Get current settings
curl http://localhost:3000/api/settings

# Update settings
curl -X POST http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{
    "LINEAR_API_KEY": "lin_api_xxx",
    "LINEAR_TEAM_ID": "TEAM",
    "CLAUDE_AUTH_METHOD": "login",
    "ANTHROPIC_API_KEY": "sk-ant-xxx"
  }'
```

## Monitoring and Logging

### Application Logs

```bash
# Docker
docker compose logs -f task-automation

# Systemd
journalctl -u 24hours-automation -f

# PM2
pm2 logs 24hours-automation
```

### Log Levels

| Level | Description |
|-------|-------------|
| `error` | Errors requiring attention |
| `warn` | Warnings and degraded operations |
| `log` | Normal operational messages |
| `debug` | Detailed debugging information |

### Health Checks

```bash
# Basic health
curl http://localhost:3000/api/monitor/dashboard

# Queue status
curl http://localhost:3000/api/monitor/queue
```

### Metrics to Monitor

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Queue length | Pending jobs | > 100 jobs |
| Failed jobs | Execution failures | > 10/hour |
| Redis memory | Queue storage | > 80% |
| Response time | API latency | > 5s |

## Backup and Recovery

### What to Backup

| Item | Location | Frequency |
|------|----------|-----------|
| SQLite database | `.claude-sessions.db` | Daily |
| Application settings | In SQLite | With database |
| Redis data | `redis-data` volume | Optional |

### Backup Script

```bash
#!/bin/bash
BACKUP_DIR="/backups/24hours"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup SQLite
cp .claude-sessions.db "$BACKUP_DIR/sessions_$DATE.db"

# Backup Redis (optional)
docker exec redis redis-cli BGSAVE
docker cp redis:/data/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb"

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -mtime +7 -delete

echo "Backup completed: $DATE"
```

### Recovery

```bash
# Stop services
docker compose down

# Restore SQLite
cp /backups/24hours/sessions_YYYYMMDD.db .claude-sessions.db

# Restore Redis (optional)
docker cp /backups/24hours/redis_YYYYMMDD.rdb redis:/data/dump.rdb

# Start services
docker compose up -d
```

## Scaling

### Horizontal Scaling

The application is designed for single-instance deployment. For higher throughput:

1. **Increase concurrency**: Adjust Bull queue concurrency settings
2. **Use managed Redis**: AWS ElastiCache, Redis Cloud, etc.
3. **Scale Claude API**: Request higher rate limits from Anthropic

### Resource Requirements

| Load | CPU | RAM | Redis |
|------|-----|-----|-------|
| Light (< 10 tasks/day) | 1 core | 2GB | 100MB |
| Medium (10-100 tasks/day) | 2 cores | 4GB | 500MB |
| Heavy (> 100 tasks/day) | 4 cores | 8GB | 1GB |

### Performance Tuning

```typescript
// Bull queue configuration
{
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    timeout: 10800000,
    removeOnComplete: true,
    removeOnFail: false
  },
  limiter: {
    max: 10,        // Max jobs per duration
    duration: 60000 // 1 minute window
  }
}
```
