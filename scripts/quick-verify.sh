#!/bin/bash

echo "=========================================="
echo "24Hours 自动化系统快速验证"
echo "=========================================="

# 1. Check backend service
echo -n "检查后端服务... "
if curl -s http://localhost:3000/api/monitor/health | grep -q "ok"; then
  echo "✓ 正常"
else
  echo "✗ 失败"
  exit 1
fi

# 2. Check Redis
echo -n "检查 Redis 连接... "
if redis-cli ping 2>/dev/null | grep -q "PONG"; then
  echo "✓ 正常"
else
  echo "✗ 失败 (请确保 Redis 已启动)"
  exit 1
fi

# 3. Check frontend
echo -n "检查前端页面... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200"; then
  echo "✓ 正常"
else
  echo "✗ 失败"
  exit 1
fi

# 4. Check WebSocket
echo -n "检查 WebSocket... "
if curl -s "http://localhost:3000/monitor/socket.io/?EIO=4&transport=polling" | grep -q "0{"; then
  echo "✓ 正常"
else
  echo "✗ 失败"
  exit 1
fi

echo ""
echo "=========================================="
echo "✓ 所有检查通过！系统运行正常"
echo "=========================================="
