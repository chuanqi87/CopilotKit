#!/bin/bash

# CoAgents Starter Demo 重启脚本
# 用于关闭当前进程并重新启动前后台服务

set -e

echo "🔄 正在重启 CoAgents Starter Demo..."
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. 关闭现有进程
echo -e "${YELLOW}📴 正在关闭现有进程...${NC}"

# 关闭端口8000的进程（Agent服务器）
echo "  - 关闭Agent服务器 (端口8000)..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || echo "    没有找到端口8000的进程"

# 关闭端口3000的进程（UI服务器）
echo "  - 关闭UI服务器 (端口3000)..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "    没有找到端口3000的进程"

# 关闭所有可能的相关进程
echo "  - 清理相关进程..."
pkill -f "poetry run demo" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "uvicorn" 2>/dev/null || true

# 等待进程完全关闭
echo "  - 等待进程完全关闭..."
sleep 2

echo -e "${GREEN}✅ 进程关闭完成${NC}"
echo ""

# 2. 检查端口状态
echo -e "${BLUE}🔍 检查端口状态...${NC}"
if lsof -i:8000 >/dev/null 2>&1; then
    echo -e "${RED}❌ 端口8000仍被占用${NC}"
    lsof -i:8000
    exit 1
else
    echo -e "${GREEN}✅ 端口8000已释放${NC}"
fi

if lsof -i:3000 >/dev/null 2>&1; then
    echo -e "${RED}❌ 端口3000仍被占用${NC}"
    lsof -i:3000
    exit 1
else
    echo -e "${GREEN}✅ 端口3000已释放${NC}"
fi

echo ""

# 3. 启动Agent服务器
echo -e "${YELLOW}🚀 启动Agent服务器...${NC}"
cd agent-py

# 确保PATH包含poetry
export PATH="/Users/legend/.local/bin:$PATH"

# 检查.env文件
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ 找不到.env文件${NC}"
    exit 1
fi

# 启动Agent服务器
echo "  - 启动Gemini Agent服务器 (端口8000)..."
nohup poetry run demo > agent.log 2>&1 &
AGENT_PID=$!

# 等待Agent服务器启动
echo "  - 等待Agent服务器启动..."
for i in {1..10}; do
    if curl -s http://localhost:8000/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Agent服务器启动成功 (PID: $AGENT_PID)${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Agent服务器启动失败${NC}"
        echo "查看日志："
        tail -20 agent.log
        exit 1
    fi
    sleep 1
done

echo ""

# 4. 启动UI服务器
echo -e "${YELLOW}🎨 启动UI服务器...${NC}"
cd ../ui

# 检查.env文件
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ 找不到.env文件${NC}"
    exit 1
fi

# 在后台启动UI服务器
echo "  - 启动前端界面 (端口3000)..."
nohup pnpm run dev > ui.log 2>&1 &
UI_PID=$!

# 等待UI服务器启动
echo "  - 等待UI服务器启动..."
for i in {1..15}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ UI服务器启动成功 (PID: $UI_PID)${NC}"
        break
    fi
    if [ $i -eq 15 ]; then
        echo -e "${RED}❌ UI服务器启动失败${NC}"
        echo "查看日志："
        tail -20 ui.log
        exit 1
    fi
    sleep 1
done

echo ""

# 5. 显示状态
echo -e "${GREEN}🎉 Demo启动完成！${NC}"
echo "=================================="
echo -e "${BLUE}📊 服务状态：${NC}"
echo "  - Agent服务器: http://localhost:8000 (PID: $AGENT_PID)"
echo "  - UI界面:     http://localhost:3000 (PID: $UI_PID)"
echo "  - 模型:       Gemini 2.5 Pro"
echo ""
echo -e "${BLUE}📋 有用的命令：${NC}"
echo "  - 查看Agent日志: tail -f agent-py/agent.log"
echo "  - 查看UI日志:    tail -f ui/ui.log"
echo "  - 停止服务:      ./stop-demo.sh"
echo ""
echo -e "${YELLOW}🌐 在浏览器中访问: http://localhost:3000${NC}"
echo ""
echo -e "${GREEN}✨ 开始体验你的Gemini AI助手吧！${NC}" 