#!/usr/bin/env python3
"""
LangSmith 平台自动化部署辅助脚本
"""

import os
import json
import subprocess
import sys
import time
import webbrowser
from typing import Dict, Any

def print_step(step_number: int, description: str):
    """打印格式化的步骤信息"""
    print(f"\n🚀 步骤 {step_number}: {description}")
    print("=" * 50)

def print_success(message: str):
    """打印成功信息"""
    print(f"✅ {message}")

def print_error(message: str):
    """打印错误信息"""
    print(f"❌ {message}")

def print_info(message: str):
    """打印信息"""
    print(f"ℹ️  {message}")

def check_prerequisites():
    """检查部署前提条件"""
    print_step(1, "检查部署前提条件")
    
    # 检查 Git 状态
    try:
        result = subprocess.run(['git', 'status', '--porcelain'], 
                              capture_output=True, text=True, check=True)
        if result.stdout.strip():
            print_error("Git 工作区不干净，请先提交所有更改")
            return False
        print_success("Git 工作区状态正常")
    except subprocess.CalledProcessError:
        print_error("Git 检查失败")
        return False
    
    # 检查必要文件
    required_files = [
        'langgraph.json',
        'pyproject.toml',
        'requirements.txt',
        'sample_agent/agent.py'
    ]
    
    for file in required_files:
        if os.path.exists(file):
            print_success(f"找到必要文件: {file}")
        else:
            print_error(f"缺少必要文件: {file}")
            return False
    
    return True

def get_deployment_config() -> Dict[str, Any]:
    """获取部署配置"""
    print_step(2, "获取部署配置")
    
    config = {
        "repository": "chuanqi87/CopilotKit",
        "branch": "main",
        "project_path": "examples/coagents-starter/agent-py",
        "env_vars": {
            "LANGSMITH_API_KEY": "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",
            "LANGCHAIN_PROJECT": "coagents-starter",
            "LANGCHAIN_TRACING_V2": "true"
        }
    }
    
    print_success("部署配置已准备就绪")
    print(f"   仓库: {config['repository']}")
    print(f"   分支: {config['branch']}")
    print(f"   项目路径: {config['project_path']}")
    
    return config

def create_deployment_instructions(config: Dict[str, Any]):
    """创建部署指令"""
    print_step(3, "生成部署指令")
    
    instructions = f"""
# LangSmith 平台部署指令

## 自动打开部署页面
我将为您自动打开 LangSmith 部署页面...

## 部署配置信息

### 仓库配置
- 仓库: {config['repository']}
- 分支: {config['branch']}
- 项目路径: {config['project_path']}

### 环境变量配置
"""
    
    for key, value in config['env_vars'].items():
        instructions += f"- {key}: {value}\n"
    
    instructions += """
### 部署步骤
1. 点击 "Import from GitHub" （如果首次使用）
2. 选择仓库: chuanqi87/CopilotKit
3. 选择分支: main
4. 设置项目路径: examples/coagents-starter/agent-py
5. 添加环境变量（见上面的配置）
6. 点击 "Submit" 开始部署
"""
    
    print(instructions)
    return instructions

def open_deployment_page():
    """打开 LangSmith 部署页面"""
    print_step(4, "打开 LangSmith 部署页面")
    
    # LangSmith 部署页面 URL
    deployment_url = "https://smith.langchain.com/deployments"
    
    print_info(f"正在打开: {deployment_url}")
    
    try:
        webbrowser.open(deployment_url)
        print_success("已在浏览器中打开 LangSmith 部署页面")
    except Exception as e:
        print_error(f"无法打开浏览器: {e}")
        print_info(f"请手动访问: {deployment_url}")

def wait_for_deployment():
    """等待部署完成"""
    print_step(5, "等待部署完成")
    
    print_info("部署通常需要 10-15 分钟...")
    print_info("您可以在 LangSmith 部署页面查看进度")
    
    # 询问用户是否继续等待
    response = input("\n是否等待部署完成? (y/N): ").strip().lower()
    
    if response == 'y' or response == 'yes':
        print_info("等待部署完成...")
        # 这里可以添加轮询逻辑，但需要 API 支持
        for i in range(15):
            time.sleep(60)  # 等待 1 分钟
            print(f"已等待 {i+1} 分钟...")
        
        print_info("预计部署时间已到，请检查 LangSmith 控制台")
    else:
        print_info("请手动检查部署状态")

def provide_test_instructions():
    """提供测试指令"""
    print_step(6, "测试部署")
    
    test_code = '''
# 测试部署的代码示例

from langgraph_sdk import get_client

# 替换为您的实际部署 URL
client = get_client(
    url="your-deployment-url", 
    api_key="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"
)

# 测试请求
async def test_deployment():
    async for chunk in client.runs.stream(
        None,  # Threadless run
        "sample_agent",  # Assistant name
        input={
            "messages": [{
                "role": "human",
                "content": "Hello, how are you?",
            }],
        },
        stream_mode="updates",
    ):
        print(f"Event: {chunk.event}")
        print(chunk.data)

# 运行测试
import asyncio
asyncio.run(test_deployment())
'''
    
    print("部署完成后，您可以使用以下代码测试：")
    print(test_code)

def main():
    """主函数"""
    print("🚀 LangSmith 平台自动化部署工具")
    print("=" * 50)
    
    try:
        # 检查前提条件
        if not check_prerequisites():
            sys.exit(1)
        
        # 获取部署配置
        config = get_deployment_config()
        
        # 创建部署指令
        create_deployment_instructions(config)
        
        # 打开部署页面
        open_deployment_page()
        
        # 等待部署完成
        wait_for_deployment()
        
        # 提供测试指令
        provide_test_instructions()
        
        print_success("部署流程已完成！")
        
    except KeyboardInterrupt:
        print("\n❌ 用户取消了部署过程")
        sys.exit(1)
    except Exception as e:
        print_error(f"部署过程中发生错误: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 