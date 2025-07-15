#!/bin/bash

# CoAgents Starter - Render 部署脚本
# 这个脚本帮助您快速准备部署到 Render 平台

set -e

echo "🚀 CopilotKit CoAgents Starter - Render 部署准备"
echo "=================================================="

# 检查必要的工具
check_tools() {
    echo "📋 检查必要工具..."
    
    if ! command -v git &> /dev/null; then
        echo "❌ Git 未安装，请先安装 Git"
        exit 1
    fi
    
    if ! command -v pnpm &> /dev/null; then
        echo "⚠️  pnpm 未安装，尝试使用 npm..."
        if ! command -v npm &> /dev/null; then
            echo "❌ npm 也未安装，请先安装 Node.js 和 npm"
            exit 1
        fi
        USE_NPM=true
    fi
    
    echo "✅ 工具检查完成"
}

# 检查环境变量
check_env() {
    echo "🔐 检查环境变量..."
    
    if [ -z "$OPENAI_API_KEY" ]; then
        echo "⚠️  OPENAI_API_KEY 未设置"
        read -p "请输入您的 OpenAI API Key: " OPENAI_API_KEY
        if [ -z "$OPENAI_API_KEY" ]; then
            echo "❌ OpenAI API Key 是必需的"
            exit 1
        fi
    fi
    
    if [ -z "$LANGSMITH_API_KEY" ]; then
        echo "📝 LangSmith API Key 未设置 (可选)"
        read -p "请输入您的 LangSmith API Key (可选，直接回车跳过): " LANGSMITH_API_KEY
    fi
    
    echo "✅ 环境变量检查完成"
}

# 创建环境文件
create_env_files() {
    echo "📄 创建环境文件..."
    
    # Python Agent 环境文件
    cat > agent-py/.env << EOF
OPENAI_API_KEY=$OPENAI_API_KEY
LANGSMITH_API_KEY=$LANGSMITH_API_KEY
LANGGRAPH_API=true
HOST=0.0.0.0
PORT=8000
EOF
    
    # UI 环境文件
    cat > ui/.env << EOF
OPENAI_API_KEY=$OPENAI_API_KEY
REMOTE_ACTION_URL=http://localhost:8000/copilotkit
NODE_ENV=development
EOF
    
    echo "✅ 环境文件创建完成"
}

# 安装依赖
install_dependencies() {
    echo "📦 安装依赖..."
    
    # Python Agent 依赖
    echo "安装 Python Agent 依赖..."
    cd agent-py
    if command -v poetry &> /dev/null; then
        poetry install
    else
        echo "⚠️  Poetry 未安装，跳过 Python 依赖安装"
        echo "请手动运行: cd agent-py && poetry install"
    fi
    cd ..
    
    # UI 依赖
    echo "安装 UI 依赖..."
    cd ui
    if [ "$USE_NPM" = true ]; then
        npm install
    else
        pnpm install
    fi
    cd ..
    
    echo "✅ 依赖安装完成"
}

# 验证部署配置
validate_config() {
    echo "🔍 验证部署配置..."
    
    # 检查 render.yaml 文件
    if [ ! -f "render.yaml" ]; then
        echo "❌ render.yaml 文件不存在"
        exit 1
    fi
    
    # 检查健康检查端点
    if [ ! -f "ui/app/api/health/route.ts" ]; then
        echo "❌ UI 健康检查端点不存在"
        exit 1
    fi
    
    echo "✅ 配置验证完成"
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "🎉 部署准备完成！"
    echo "=================="
    echo ""
    echo "📋 下一步："
    echo "1. 将代码推送到 GitHub 仓库"
    echo "2. 登录 Render Dashboard (https://dashboard.render.com)"
    echo "3. 创建新的 Blueprint 并连接您的仓库"
    echo "4. 选择 examples/coagents-starter 目录"
    echo "5. 配置环境变量："
    echo "   - OPENAI_API_KEY: $OPENAI_API_KEY"
    if [ ! -z "$LANGSMITH_API_KEY" ]; then
        echo "   - LANGSMITH_API_KEY: $LANGSMITH_API_KEY"
    fi
    echo ""
    echo "📖 详细部署说明请查看 DEPLOY_TO_RENDER.md"
    echo ""
    echo "🔧 本地测试："
    echo "   终端 1: cd agent-py && poetry run demo"
    echo "   终端 2: cd ui && pnpm run dev"
    echo "   浏览器: http://localhost:3000"
}

# 主函数
main() {
    check_tools
    check_env
    create_env_files
    install_dependencies
    validate_config
    show_deployment_info
}

# 运行主函数
main "$@"