# 部署到 Render

这份文档将指导您如何将 CopilotKit CoAgents Starter 项目部署到 Render 平台。

## 前提条件

1. 一个 [Render](https://render.com) 账户
2. 一个 GitHub 仓库包含此项目代码
3. OpenAI API Key (支持 GPT-4o)
4. LangSmith API Key (可选，用于监控)

## 快速部署

### 方法1：使用 render.yaml 自动部署

1. **Fork 并克隆项目**
   ```bash
   git clone https://github.com/your-username/CopilotKit.git
   cd CopilotKit/examples/coagents-starter
   ```

2. **连接到 Render**
   - 登录 [Render Dashboard](https://dashboard.render.com)
   - 点击 "New" → "Blueprint"
   - 连接您的 GitHub 仓库
   - 选择 `examples/coagents-starter` 目录

3. **配置环境变量**
   在 Render 中设置以下环境变量：
   - `OPENAI_API_KEY`: 您的 OpenAI API Key
   - `LANGSMITH_API_KEY`: 您的 LangSmith API Key (可选)

4. **部署**
   - Render 会自动检测 `render.yaml` 文件
   - 部署两个服务：
     - `coagents-python-agent`: Python 后端服务
     - `coagents-ui`: Next.js 前端应用

### 方法2：手动创建服务

如果您喜欢手动控制部署过程：

#### 部署 Python Agent

1. 在 Render Dashboard 中点击 "New" → "Web Service"
2. 连接您的 GitHub 仓库
3. 配置如下：
   - **Name**: `coagents-python-agent`
   - **Runtime**: Docker
   - **Region**: Oregon (或您偏好的地区)
   - **Branch**: `main`
   - **Root Directory**: `examples/coagents-starter/agent-py`
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Starter (可以稍后升级)

4. 环境变量：
   ```
   OPENAI_API_KEY=your_openai_key_here
   LANGSMITH_API_KEY=your_langsmith_key_here
   LANGGRAPH_API=true
   HOST=0.0.0.0
   PORT=8000
   ```

5. 健康检查：`/health`

#### 部署 UI

1. 在 Render Dashboard 中点击 "New" → "Web Service"
2. 连接您的 GitHub 仓库
3. 配置如下：
   - **Name**: `coagents-ui`
   - **Runtime**: Node
   - **Region**: Oregon (或您偏好的地区)
   - **Branch**: `main`
   - **Root Directory**: `examples/coagents-starter/ui`
   - **Build Command**: `pnpm install && pnpm run build`
   - **Start Command**: `pnpm start`
   - **Plan**: Starter

4. 环境变量：
   ```
   OPENAI_API_KEY=your_openai_key_here
   REMOTE_ACTION_URL=https://coagents-python-agent.onrender.com/copilotkit
   NODE_ENV=production
   NEXT_PUBLIC_DEPLOYMENT_URL=https://coagents-ui.onrender.com
   ```

5. 健康检查：`/api/health`

## 部署后配置

### 更新域名

1. 在 Python Agent 服务部署成功后，记录其 URL
2. 更新 UI 服务的 `REMOTE_ACTION_URL` 环境变量为实际的 Python Agent URL
3. 重新部署 UI 服务

### 自定义域名 (可选)

如果您有自定义域名：

1. 在 Render Dashboard 中的服务设置里添加自定义域名
2. 更新相应的环境变量
3. 重新部署服务

## 监控和日志

### 查看日志

1. 在 Render Dashboard 中选择服务
2. 点击 "Logs" 标签查看实时日志
3. 使用搜索功能过滤特定日志

### 性能监控

1. 启用 Render 的监控功能
2. 配置 LangSmith 追踪 (如果有 API Key)
3. 监控健康检查端点

## 故障排除

### 常见问题

1. **Python Agent 启动失败**
   - 检查 `OPENAI_API_KEY` 是否正确设置
   - 确认 Dockerfile 构建没有错误
   - 查看服务日志获取详细错误信息

2. **UI 无法连接到 Agent**
   - 验证 `REMOTE_ACTION_URL` 是否指向正确的 Python Agent URL
   - 确认 Python Agent 的 `/copilotkit` 端点正常工作
   - 检查 CORS 设置

3. **部署超时**
   - 尝试选择不同的地区
   - 检查是否有太多并发部署
   - 考虑升级到更高配置的计划

### 调试步骤

1. **检查健康检查端点**
   ```bash
   curl https://your-python-agent-url.onrender.com/health
   curl https://your-ui-url.onrender.com/api/health
   ```

2. **测试 Agent 连接**
   ```bash
   curl -X POST https://your-python-agent-url.onrender.com/copilotkit \
     -H "Content-Type: application/json" \
     -d '{"message": "hello"}'
   ```

3. **查看详细日志**
   - 在 Render Dashboard 中启用详细日志
   - 检查启动顺序和依赖关系

## 成本优化

### 建议

1. **使用 Starter 计划**：适合开发和测试
2. **监控使用情况**：根据实际流量调整配置
3. **启用睡眠模式**：对于开发环境，可以启用自动睡眠以节省成本
4. **缓存配置**：合理配置缓存以减少重复计算

### 扩展计划

当您的应用需要更多资源时：

1. 升级到 Standard 或 Pro 计划
2. 启用自动扩展
3. 配置负载均衡
4. 考虑使用 Redis 缓存

## 安全建议

1. **环境变量管理**
   - 使用 Render 的环境变量管理，不要在代码中硬编码敏感信息
   - 定期轮换 API Keys

2. **网络安全**
   - 配置适当的 CORS 策略
   - 使用 HTTPS (Render 默认提供)
   - 限制不必要的端点访问

3. **访问控制**
   - 实施用户认证 (根据需要)
   - 配置 API 速率限制
   - 监控异常访问模式

## 支持

如果您在部署过程中遇到问题：

1. 查看 [Render 文档](https://render.com/docs)
2. 查看 [CopilotKit 文档](https://docs.copilotkit.ai/)
3. 在 [CopilotKit Discord](https://discord.gg/copilotkit) 寻求帮助
4. 提交 [GitHub Issues](https://github.com/CopilotKit/CopilotKit/issues)

---

**祝您部署成功！** 🚀