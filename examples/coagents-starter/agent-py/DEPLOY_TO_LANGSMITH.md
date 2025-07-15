# 🚀 部署到 LangSmith 平台指南

## 概述

LangGraph Platform 是 LangSmith 的托管服务，可以直接从 GitHub 仓库部署您的 LangGraph 应用。

## 前提条件

- ✅ GitHub 账户
- ✅ LangSmith 账户（免费注册）
- ✅ LangSmith API Key

## 部署步骤

### 1. 准备代码

确保您的代码已经推送到 GitHub 仓库（当前项目已经配置好）：

```bash
# 添加所有文件到 Git
git add .

# 提交更改
git commit -m "准备部署到 LangGraph Platform"

# 推送到 GitHub
git push origin main
```

### 2. 在 LangSmith 中创建部署

1. 登录 [LangSmith](https://smith.langchain.com)
2. 在左侧导航栏中选择 **"Deployments"**
3. 点击 **"+ New Deployment"** 按钮
4. 如果是首次使用或添加私有仓库，点击 **"Import from GitHub"** 并按照说明连接 GitHub 账户
5. 选择您的 CopilotKit 仓库
6. 选择分支：`main`
7. 选择项目路径：`examples/coagents-starter/agent-py`
8. 点击 **"Submit"** 开始部署

### 3. 配置环境变量

在部署详情页面中，添加以下环境变量：

**必需变量：**
- `LANGSMITH_API_KEY`: 您的 LangSmith API Key
- `LANGCHAIN_PROJECT`: 项目名称（例如：`coagents-starter`）

**可选变量：**
- `OPENAI_API_KEY`: OpenAI API Key
- `ANTHROPIC_API_KEY`: Anthropic API Key
- `LANGCHAIN_TRACING_V2`: 设置为 `true` 开启追踪

### 4. 等待部署完成

部署过程通常需要 10-15 分钟。您可以在 **"Deployment details"** 页面查看状态。

### 5. 测试部署

部署完成后：

1. 点击 **"LangGraph Studio"** 按钮测试您的图形
2. 获取 API URL 并测试：

```python
from langgraph_sdk import get_client

client = get_client(
    url="your-deployment-url", 
    api_key="your-langsmith-api-key"
)

# 测试请求
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
```

### 6. 使用 REST API

```bash
curl -s --request POST \
    --url <DEPLOYMENT_URL>/runs/stream \
    --header 'Content-Type: application/json' \
    --header "X-Api-Key: <LANGSMITH_API_KEY>" \
    --data '{
        "assistant_id": "sample_agent",
        "input": {
            "messages": [{
                "role": "human",
                "content": "Hello from LangGraph Platform!"
            }]
        },
        "stream_mode": "updates"
    }'
```

## 项目结构

当前项目已经配置好了以下必要文件：

- ✅ `langgraph.json` - LangGraph 配置文件
- ✅ `pyproject.toml` - Python 依赖管理
- ✅ `requirements.txt` - 替代依赖文件
- ✅ `sample_agent/agent.py` - 主要代理逻辑
- ✅ `Dockerfile` - 自定义 Docker 构建（如果需要）

## 常见问题

### Q: 部署失败怎么办？
A: 检查日志，确保所有依赖版本兼容，特别是 `langgraph >= 0.3.27`

### Q: 如何更新部署？
A: 推送新代码到 GitHub，LangGraph Platform 会自动重新部署

### Q: 如何查看日志？
A: 在 LangSmith 部署详情页面查看实时日志

### Q: 支持哪些 Python 版本？
A: 支持 Python 3.10-3.13（当前配置为 3.12）

## 成本

- **免费层**: 每月一定量的免费使用
- **付费层**: 基于使用量计费

## 下一步

🎉 恭喜！您的 LangGraph 应用现在已经部署到 LangSmith 平台！

- 在 LangGraph Studio 中测试您的应用
- 集成到您的前端应用中
- 设置监控和告警
- 查看追踪和性能指标

## 支持

如果遇到问题，请查看：
- [LangGraph Platform 文档](https://langchain-ai.github.io/langgraph/cloud/)
- [LangSmith 文档](https://docs.smith.langchain.com/)
- [GitHub Issues](https://github.com/langchain-ai/langgraph/issues) 