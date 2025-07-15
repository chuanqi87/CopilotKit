#!/bin/bash

# CoAgents Starter Demo 停止脚本
# 用于关闭所有相关进程

echo "🛑 正在停止 CoAgents Starter Demo..."
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. 关闭端口8000的进程（Agent服务器）
echo -e "${YELLOW}📴 关闭Agent服务器 (端口8000)...${NC}"
if lsof -ti:8000 >/dev/null 2>&1; then
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✅ Agent服务器已关闭${NC}"
else
    echo "  没有找到端口8000的进程"
fi

# 2. 关闭端口3000的进程（UI服务器）
echo -e "${YELLOW}📴 关闭UI服务器 (端口3000)...${NC}"
if lsof -ti:3000 >/dev/null 2>&1; then
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✅ UI服务器已关闭${NC}"
else
    echo "  没有找到端口3000的进程"
fi

# 3. 关闭所有可能的相关进程
echo -e "${YELLOW}📴 清理相关进程...${NC}"
pkill -f "poetry run demo" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "uvicorn" 2>/dev/null || true

# 4. 等待进程完全关闭
echo "  - 等待进程完全关闭..."
sleep 2

# 5. 验证进程是否已关闭
echo -e "${BLUE}🔍 验证进程状态...${NC}"
PROCESSES_RUNNING=false

if lsof -i:8000 >/dev/null 2>&1; then
    echo -e "${RED}❌ 端口8000仍被占用:${NC}"
    lsof -i:8000
    PROCESSES_RUNNING=true
else
    echo -e "${GREEN}✅ 端口8000已释放${NC}"
fi

if lsof -i:3000 >/dev/null 2>&1; then
    echo -e "${RED}❌ 端口3000仍被占用:${NC}"
    lsof -i:3000
    PROCESSES_RUNNING=true
else
    echo -e "${GREEN}✅ 端口3000已释放${NC}"
fi

echo ""

# 6. 显示结果
if [ "$PROCESSES_RUNNING" = true ]; then
    echo -e "${YELLOW}⚠️  有些进程可能仍在运行${NC}"
    echo -e "${BLUE}💡 如果需要强制终止，请手动运行：${NC}"
    echo "   sudo lsof -ti:8000 | xargs kill -9"
    echo "   sudo lsof -ti:3000 | xargs kill -9"
else
    echo -e "${GREEN}🎉 所有进程已成功停止！${NC}"
fi

echo ""
echo -e "${BLUE}📋 有用的命令：${NC}"
echo "  - 重新启动: ./restart-demo.sh"
echo "  - 查看进程: ps aux | grep -E '(poetry|next|uvicorn)'"
echo "  - 检查端口: lsof -i:8000 && lsof -i:3000" 