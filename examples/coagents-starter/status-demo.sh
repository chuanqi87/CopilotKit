#!/bin/bash

# CoAgents Starter Demo 状态检查脚本
# 用于快速查看服务状态和日志

echo "📊 CoAgents Starter Demo 状态检查"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. 检查端口状态
echo -e "${BLUE}🔍 检查服务状态...${NC}"

# Agent服务器检查
if lsof -i:8000 >/dev/null 2>&1; then
    AGENT_PID=$(lsof -ti:8000)
    echo -e "${GREEN}✅ Agent服务器运行中${NC} (端口8000, PID: $AGENT_PID)"
    # 测试API响应
    if curl -s -f http://localhost:8000/health >/dev/null 2>&1; then
        echo "   🌐 API响应正常"
    else
        echo -e "${YELLOW}   ⚠️  API可能未完全启动${NC}"
    fi
else
    echo -e "${RED}❌ Agent服务器未运行${NC} (端口8000)"
fi

# UI服务器检查
if lsof -i:3000 >/dev/null 2>&1; then
    UI_PID=$(lsof -ti:3000)
    echo -e "${GREEN}✅ UI服务器运行中${NC} (端口3000, PID: $UI_PID)"
    # 测试UI响应
    if curl -s -f http://localhost:3000 >/dev/null 2>&1; then
        echo "   🌐 UI响应正常"
    else
        echo -e "${YELLOW}   ⚠️  UI可能未完全启动${NC}"
    fi
else
    echo -e "${RED}❌ UI服务器未运行${NC} (端口3000)"
fi

echo ""

# 2. 检查进程详情
echo -e "${BLUE}🔍 进程详情...${NC}"
ps aux | grep -E "(poetry run demo|next dev|uvicorn)" | grep -v grep | while read line; do
    echo "   $line"
done

echo ""

# 3. 检查日志文件
echo -e "${BLUE}📋 日志文件状态...${NC}"

if [ -f "agent-py/agent.log" ]; then
    AGENT_LOG_SIZE=$(du -h agent-py/agent.log | cut -f1)
    AGENT_LOG_LINES=$(wc -l < agent-py/agent.log)
    echo -e "${GREEN}✅ Agent日志${NC}: agent-py/agent.log ($AGENT_LOG_SIZE, $AGENT_LOG_LINES 行)"
else
    echo -e "${YELLOW}⚠️  Agent日志文件不存在${NC}"
fi

if [ -f "ui/ui.log" ]; then
    UI_LOG_SIZE=$(du -h ui/ui.log | cut -f1)
    UI_LOG_LINES=$(wc -l < ui/ui.log)
    echo -e "${GREEN}✅ UI日志${NC}: ui/ui.log ($UI_LOG_SIZE, $UI_LOG_LINES 行)"
else
    echo -e "${YELLOW}⚠️  UI日志文件不存在${NC}"
fi

echo ""

# 4. 显示最近的日志（如果有错误）
echo -e "${BLUE}📄 最近的错误日志...${NC}"

if [ -f "agent-py/agent.log" ]; then
    AGENT_ERRORS=$(tail -20 agent-py/agent.log | grep -i error | head -3)
    if [ -n "$AGENT_ERRORS" ]; then
        echo -e "${RED}❌ Agent错误:${NC}"
        echo "$AGENT_ERRORS" | sed 's/^/   /'
    else
        echo -e "${GREEN}✅ Agent日志无错误${NC}"
    fi
fi

if [ -f "ui/ui.log" ]; then
    UI_ERRORS=$(tail -20 ui/ui.log | grep -i error | head -3)
    if [ -n "$UI_ERRORS" ]; then
        echo -e "${RED}❌ UI错误:${NC}"
        echo "$UI_ERRORS" | sed 's/^/   /'
    else
        echo -e "${GREEN}✅ UI日志无错误${NC}"
    fi
fi

echo ""

# 5. 显示可用命令
echo -e "${BLUE}📋 可用命令:${NC}"
echo "  - 重新启动: ./restart-demo.sh"
echo "  - 停止服务: ./stop-demo.sh"
echo "  - 查看状态: ./status-demo.sh"
echo "  - 查看Agent日志: tail -f agent-py/agent.log"
echo "  - 查看UI日志: tail -f ui/ui.log"
echo "  - 实时查看所有日志: tail -f agent-py/agent.log ui/ui.log"

echo ""
echo -e "${YELLOW}🌐 访问地址: http://localhost:3000${NC}" 