# Troubleshooting Guide

This guide helps diagnose and resolve common issues with 24Hours Automation.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Connection Issues](#connection-issues)
- [Task Execution Issues](#task-execution-issues)
- [Authentication Issues](#authentication-issues)
- [Dashboard Issues](#dashboard-issues)
- [Performance Issues](#performance-issues)
- [Data Issues](#data-issues)
- [Docker Issues](#docker-issues)

## Quick Diagnostics

### Health Check Script

```bash
#!/bin/bash
echo "=== 24Hours Automation Health Check ==="

# Check Redis
echo -n "Redis: "
redis-cli ping 2>/dev/null && echo "OK" || echo "FAILED"

# Check Backend
echo -n "Backend API: "
curl -s http://localhost:3000/api/monitor/dashboard > /dev/null && echo "OK" || echo "FAILED"

# Check Frontend
echo -n "Frontend: "
curl -s http://localhost:5173 > /dev/null && echo "OK" || echo "FAILED"

# Check Queue
echo -n "Queue Length: "
curl -s http://localhost:3000/api/monitor/queue | jq '.length // 0'

# Check Running Tasks
echo -n "Running Tasks: "
curl -s http://localhost:3000/api/monitor/dashboard | jq '.runningTasks | length'
```

### Log Analysis

```bash
# Backend logs (Docker)
docker compose logs task-automation --tail 100

# Look for errors
docker compose logs task-automation 2>&1 | grep -i error

# Look for warnings
docker compose logs task-automation 2>&1 | grep -i warn
```

## Connection Issues

### Redis Connection Failed

**Symptoms:**
- Backend fails to start
- Error: `ECONNREFUSED 127.0.0.1:6379`

**Solutions:**

1. **Check Redis is running:**
   ```bash
   # Check status
   redis-cli ping

   # Start Redis
   redis-server
   # or
   docker compose up redis -d
   ```

2. **Check Redis configuration:**
   ```bash
   # Verify environment variables
   echo $REDIS_HOST
   echo $REDIS_PORT
   ```

3. **Check Docker network:**
   ```bash
   # List networks
   docker network ls

   # Inspect network
   docker network inspect 24hours_default
   ```

### Linear API Connection Failed

**Symptoms:**
- Tasks not being polled
- Error: `Linear client failed to initialize`

**Solutions:**

1. **Verify API key:**
   - Check Settings panel in dashboard
   - Ensure key has read/write permissions
   - Try generating a new key

2. **Check network access:**
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.linear.app/graphql
   ```

3. **Verify team ID:**
   - Team ID should be the key (e.g., "TEAM"), not the UUID
   - Check Linear Settings → Workspace → Team key

### WebSocket Connection Issues

**Symptoms:**
- Dashboard not updating in real-time
- Console error: `WebSocket connection failed`

**Solutions:**

1. **Check backend is running:**
   ```bash
   curl http://localhost:3000/api/monitor/dashboard
   ```

2. **Check CORS configuration:**
   - Frontend URL must be allowed by backend
   - Check browser console for CORS errors

3. **Check proxy configuration:**
   ```nginx
   location /socket.io {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

## Task Execution Issues

### Tasks Not Being Picked Up

**Symptoms:**
- Tasks remain in "Todo" status
- No execution logs appearing

**Solutions:**

1. **Check poller is running:**
   ```bash
   # Look for polling logs
   docker compose logs task-automation 2>&1 | grep "polling"
   ```

2. **Verify Linear status mapping:**
   - Task status must exactly match "Todo"
   - Check Linear workflow configuration

3. **Check execution is not paused:**
   ```bash
   curl http://localhost:3000/api/monitor/dashboard | jq '.paused'
   ```

4. **Resume execution if paused:**
   ```bash
   curl -X POST http://localhost:3000/api/monitor/execution/resume
   ```

### Tasks Failing Immediately

**Symptoms:**
- Tasks move to "Failed" quickly
- Claude execution errors in logs

**Solutions:**

1. **Check Claude authentication:**
   ```bash
   # For login mode
   echo $ANTHROPIC_API_KEY

   # For api_key mode
   echo $ANTHROPIC_BASE_URL
   echo $ANTHROPIC_AUTH_TOKEN
   ```

2. **Verify Claude Code CLI:**
   ```bash
   # Check installation
   which claude

   # Test execution
   claude --version
   ```

3. **Check workspace path:**
   - If set, verify path exists and is accessible
   - Remove setting to test with default path

4. **Review error in Linear comments:**
   - Check the issue for detailed error messages
   - Look for API rate limits or quota issues

### Tasks Stuck in "In Progress"

**Symptoms:**
- Task never completes
- No progress updates

**Solutions:**

1. **Check task timeout:**
   ```bash
   # Default is 3 hours (10800000ms)
   echo $TASK_TIMEOUT
   ```

2. **Check for hung processes:**
   ```bash
   ps aux | grep claude
   ```

3. **Force fail and retry:**
   - Manually change status to "Failed" in Linear
   - Use retry endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/monitor/tasks/TASK_ID/retry
   ```

### MCP Tool Errors

**Symptoms:**
- Claude can't post comments to Linear
- Error: `MCP tool linear not available`

**Solutions:**

1. **Verify MCP configuration:**
   - Check `mcpServers` in `claude.service.ts`
   - Ensure `mcp-remote` is available via npx

2. **Test MCP manually:**
   ```bash
   npx -y mcp-remote https://mcp.linear.app/mcp
   ```

3. **Check Linear API key in MCP:**
   - Must be passed to MCP server env
   - Verify in settings

## Authentication Issues

### Anthropic API Authentication Failed

**Symptoms:**
- Error: `401 Unauthorized`
- Error: `invalid_api_key`

**Solutions:**

1. **For login mode:**
   - Verify `ANTHROPIC_API_KEY` is correct
   - Check key has not expired
   - Generate new key at console.anthropic.com

2. **For api_key mode:**
   - Verify `ANTHROPIC_BASE_URL` is correct
   - Check `ANTHROPIC_AUTH_TOKEN` is valid
   - Contact proxy provider if issues persist

3. **Check mode matches credentials:**
   ```bash
   curl http://localhost:3000/api/settings | jq '.CLAUDE_AUTH_METHOD'
   ```

### Linear API Authentication Failed

**Symptoms:**
- Error: `401 Unauthorized`
- Tasks not loading

**Solutions:**

1. **Regenerate API key:**
   - Go to Linear Settings → API
   - Delete old key, create new one
   - Update in dashboard settings

2. **Check key permissions:**
   - Key needs read and write access
   - Verify access to the correct workspace

## Dashboard Issues

### Dashboard Not Loading

**Symptoms:**
- Blank page
- Network errors in console

**Solutions:**

1. **Check frontend is running:**
   ```bash
   # Development
   cd frontend && npm run dev

   # Production
   curl http://localhost:8080
   ```

2. **Check API connection:**
   - Verify `VITE_API_URL` if running separately
   - Check browser console for API errors

3. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R / Cmd+Shift+R
   - Clear localStorage

### Stats Not Updating

**Symptoms:**
- Stale data displayed
- Numbers don't change

**Solutions:**

1. **Check WebSocket connection:**
   - Look for connection status in browser console
   - Verify `/socket.io` endpoint is accessible

2. **Manual refresh:**
   ```bash
   # Force stats refresh
   curl http://localhost:3000/api/monitor/dashboard
   ```

3. **Restart backend:**
   ```bash
   docker compose restart task-automation
   ```

## Performance Issues

### Slow Task Execution

**Symptoms:**
- Tasks taking longer than expected
- High latency in Claude responses

**Solutions:**

1. **Check API rate limits:**
   - Anthropic has usage limits
   - Check console.anthropic.com for usage

2. **Reduce concurrent tasks:**
   ```env
   MAX_CONCURRENT_TASKS=1
   ```

3. **Increase timeout for long tasks:**
   ```env
   TASK_TIMEOUT=21600000  # 6 hours
   ```

### High Memory Usage

**Symptoms:**
- Application crashes
- Out of memory errors

**Solutions:**

1. **Check memory allocation:**
   ```bash
   # Docker
   docker stats

   # Node.js
   node --max-old-space-size=4096 dist/main
   ```

2. **Clean up old jobs:**
   ```bash
   # Redis cleanup
   redis-cli FLUSHDB
   ```

3. **Restart services:**
   ```bash
   docker compose restart
   ```

### Queue Backlog

**Symptoms:**
- Many jobs waiting
- Long queue times

**Solutions:**

1. **Check for failed jobs:**
   ```bash
   curl http://localhost:3000/api/monitor/queue | jq '.failed'
   ```

2. **Increase concurrency:**
   ```env
   MAX_CONCURRENT_TASKS=5
   ```

3. **Clear stuck jobs:**
   ```bash
   # Caution: removes all jobs
   redis-cli FLUSHDB
   ```

## Data Issues

### SQLite Database Corrupted

**Symptoms:**
- Error: `SQLITE_CORRUPT`
- Settings not saving

**Solutions:**

1. **Backup current database:**
   ```bash
   cp .claude-sessions.db .claude-sessions.db.backup
   ```

2. **Delete and recreate:**
   ```bash
   rm .claude-sessions.db
   # Restart application - database will be recreated
   ```

3. **Restore from backup:**
   ```bash
   cp /backups/sessions_YYYYMMDD.db .claude-sessions.db
   ```

### Session IDs Lost

**Symptoms:**
- Cannot retry failed tasks
- Error: `No session found for task`

**Solutions:**

1. **Check database has sessions:**
   ```bash
   sqlite3 .claude-sessions.db "SELECT * FROM task_sessions LIMIT 10;"
   ```

2. **Task must be re-executed:**
   - Change status to "Todo" in Linear
   - System will create new session

### Settings Not Persisting

**Symptoms:**
- Settings reset after restart
- Error saving settings

**Solutions:**

1. **Check database permissions:**
   ```bash
   ls -la .claude-sessions.db
   # Should be readable/writable
   ```

2. **Check disk space:**
   ```bash
   df -h
   ```

3. **Verify settings are saved:**
   ```bash
   sqlite3 .claude-sessions.db "SELECT * FROM settings;"
   ```

## Docker Issues

### Container Won't Start

**Symptoms:**
- Exit code 1
- Container restarts repeatedly

**Solutions:**

1. **Check logs:**
   ```bash
   docker compose logs task-automation
   ```

2. **Verify build:**
   ```bash
   docker compose build --no-cache
   ```

3. **Check port conflicts:**
   ```bash
   lsof -i :3000
   lsof -i :8080
   ```

### Network Issues Between Containers

**Symptoms:**
- Backend can't reach Redis
- Frontend can't reach backend

**Solutions:**

1. **Check network:**
   ```bash
   docker network inspect 24hours_default
   ```

2. **Verify service names:**
   - Use `redis` not `localhost` for Redis host
   - Use `task-automation` for backend

3. **Recreate network:**
   ```bash
   docker compose down
   docker network prune
   docker compose up -d
   ```

### Volume Permission Issues

**Symptoms:**
- Cannot write to mounted volumes
- Permission denied errors

**Solutions:**

1. **Check ownership:**
   ```bash
   ls -la logs/
   ls -la .claude-sessions.db
   ```

2. **Fix permissions:**
   ```bash
   sudo chown -R $(id -u):$(id -g) logs/
   sudo chown $(id -u):$(id -g) .claude-sessions.db
   ```

3. **Use named volumes:**
   ```yaml
   volumes:
     - data:/app/data
   ```

## Getting Help

If you can't resolve an issue:

1. **Gather information:**
   - Application logs
   - Error messages
   - Steps to reproduce

2. **Check existing issues:**
   - Search GitHub Issues for similar problems

3. **Open new issue:**
   - Use the issue template
   - Include all relevant details

4. **Community support:**
   - GitHub Discussions for questions
   - Include your environment details
