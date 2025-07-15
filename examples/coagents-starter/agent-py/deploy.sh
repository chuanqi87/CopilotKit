#!/bin/bash

# =============================================================================
# LangGraph Standalone Container (Lite) 部署脚本
# =============================================================================

set -e  # 遇到错误时立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的工具
check_dependencies() {
    print_info "检查必要的工具..."
    
    command -v docker >/dev/null 2>&1 || {
        print_error "Docker 未安装。请先安装 Docker。"
        exit 1
    }
    
    command -v docker-compose >/dev/null 2>&1 || {
        print_error "Docker Compose 未安装。请先安装 Docker Compose。"
        exit 1
    }
    
    command -v langgraph >/dev/null 2>&1 || {
        print_error "LangGraph CLI 未安装。请运行: pip install langgraph-cli"
        exit 1
    }
    
    print_success "所有必要工具已安装"
}

# 检查环境变量
check_env_vars() {
    print_info "检查环境变量..."
    
    if [ -z "$LANGSMITH_API_KEY" ]; then
        print_error "LANGSMITH_API_KEY 环境变量未设置"
        print_info "请访问 https://smith.langchain.com 获取 API Key"
        exit 1
    fi
    
    print_success "环境变量检查通过"
}

# 构建 Docker 镜像
build_image() {
    print_info "构建 Docker 镜像..."
    
    IMAGE_NAME="langgraph-agent:latest"
    
    # 使用 LangGraph CLI 构建镜像
    langgraph build --tag $IMAGE_NAME
    
    if [ $? -eq 0 ]; then
        print_success "Docker 镜像构建成功: $IMAGE_NAME"
        export IMAGE_NAME
    else
        print_error "Docker 镜像构建失败"
        exit 1
    fi
}

# 启动服务
start_services() {
    print_info "启动服务..."
    
    # 确保 logs 目录存在
    mkdir -p logs
    
    # 启动 Docker Compose 服务
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        print_success "服务启动成功"
    else
        print_error "服务启动失败"
        exit 1
    fi
}

# 等待服务就绪
wait_for_services() {
    print_info "等待服务就绪..."
    
    # 等待 API 服务就绪
    for i in {1..30}; do
        if curl -f http://localhost:8123/ok > /dev/null 2>&1; then
            print_success "服务已就绪"
            return 0
        fi
        echo -n "."
        sleep 2
    done
    
    print_error "服务启动超时"
    exit 1
}

# 显示部署信息
show_deployment_info() {
    print_success "部署完成！"
    echo
    print_info "服务访问信息:"
    echo "  - API 服务: http://localhost:8123"
    echo "  - 健康检查: http://localhost:8123/ok"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Redis: localhost:6379"
    echo
    print_info "日志查看:"
    echo "  - 查看所有日志: docker-compose logs -f"
    echo "  - 查看 API 日志: docker-compose logs -f langgraph-api"
    echo
    print_info "管理命令:"
    echo "  - 停止服务: docker-compose down"
    echo "  - 重启服务: docker-compose restart"
    echo "  - 查看状态: docker-compose ps"
    echo
    print_info "测试 API:"
    echo "  curl -X GET http://localhost:8123/ok"
}

# 主函数
main() {
    print_info "开始部署 LangGraph Standalone Container (Lite)..."
    echo
    
    check_dependencies
    check_env_vars
    build_image
    start_services
    wait_for_services
    show_deployment_info
    
    echo
    print_success "部署完成！您的 LangGraph 代理现在运行在 http://localhost:8123"
}

# 处理中断信号
trap 'print_error "部署被中断"; exit 1' INT TERM

# 显示用法
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "用法: ./deploy.sh"
    echo
    echo "环境变量:"
    echo "  LANGSMITH_API_KEY    (必需) LangSmith API Key"
    echo "  OPENAI_API_KEY       (可选) OpenAI API Key"
    echo "  ANTHROPIC_API_KEY    (可选) Anthropic API Key"
    echo
    echo "示例:"
    echo "  export LANGSMITH_API_KEY='your_key_here'"
    echo "  ./deploy.sh"
    exit 0
fi

# 执行主函数
main 