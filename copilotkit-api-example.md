# CopilotKit API 交互示例

本文档提供了多个基于 CopilotKit 实际示例项目的 API 交互场景，展示了客户端和后端服务之间的通信模式。

## 基础场景：Action 执行

### 场景描述
后端暴露一个名为 `greet_user` 的 action，该 action 接受一个 `name` 参数并返回一句问候语。

### 1. 发现 Actions

首先，客户端向 `/info` 端点发送请求，以发现可用的 actions 和 agents。

**请求:** `POST /info`

```json
{
  "properties": {
    "userId": "user-12345",
    "theme": "dark"
  },
  "frontendUrl": "https://my-app.com"
}
```

**响应:** `200 OK`

后端返回可用 actions 的列表。在这个例子中，即为 `greet_user` action。

```json
{
  "actions": [
    {
      "name": "greet_user",
      "description": "用自定义消息问候用户。",
      "parameters": [
        {
          "name": "name",
          "type": "string",
          "description": "要问候的人的姓名。",
          "required": true
        }
      ]
    }
  ],
  "agents": [],
  "sdkVersion": "0.1.0"
}
```

### 2. 执行 Action

现在客户端知道了 `greet_user` action，便可以执行它。

**请求:** `POST /action/greet_user`

请求体包含 action 的参数。

```json
{
  "arguments": {
    "name": "World"
  },
  "properties": {
    "userId": "user-12345"
  }
}
```

**响应:** `200 OK`

后端使用提供的参数执行 action 处理程序，并返回结果。

```json
{
  "result": "Hello, World!"
}
```

## 高级场景：Agent 执行与流式响应

### 场景描述
执行一个邮件发送 agent，展示完整的流式事件处理过程。

### 3. Agent 执行示例

如果要执行 agent，客户端使用 `/agent/{name}` 路径。

**请求:** `POST /agent/email_agent`

```json
{
  "threadId": "thread-abc-123",
  "state": {},
  "messages": [
    {
      "id": "msg-1",
      "type": "TextMessage",
      "role": "user",
      "content": "给 jane@example.com 发一封邮件，内容是 hello"
    }
  ],
  "actions": [
    {
      "name": "send_email",
      "description": "发送一封邮件。",
      "parameters": [
        { "name": "to", "type": "string" },
        { "name": "body", "type": "string" }
      ]
    }
  ]
}
```

**响应:** `200 OK` (`Content-Type: application/x-ndjson`)

响应将是一个由换行符分隔的 JSON 对象流，代表 agent 执行过程中的事件。

#### 流式事件类型详解

每个流式事件都是一个 JSON 对象，包含一个 `type` 字段来标识事件类型。以下是所有可能的事件类型：

##### 1. 文本消息事件

**TextMessageStart** - 开始一个新的文本消息：
```json
{
  "type": "TextMessageStart",
  "messageId": "msg-2",
  "parentMessageId": "msg-1"
}
```

**TextMessageContent** - 文本消息的内容（可能有多个）：
```json
{
  "type": "TextMessageContent",
  "messageId": "msg-2",
  "content": "好的，我将发送一封邮件。"
}
```

**TextMessageEnd** - 结束文本消息：
```json
{
  "type": "TextMessageEnd",
  "messageId": "msg-2"
}
```

##### 2. Action 执行事件

**ActionExecutionStart** - 开始执行一个 action：
```json
{
  "type": "ActionExecutionStart",
  "actionExecutionId": "exec-1",
  "actionName": "send_email",
  "parentMessageId": "msg-2"
}
```

**ActionExecutionArgs** - Action 的参数（可能有多个）：
```json
{
  "type": "ActionExecutionArgs",
  "actionExecutionId": "exec-1",
  "args": "{\"to\":\"jane@example.com\",\"body\":\"hello\"}"
}
```

**ActionExecutionEnd** - 结束 action 执行：
```json
{
  "type": "ActionExecutionEnd",
  "actionExecutionId": "exec-1"
}
```

**ActionExecutionResult** - Action 的执行结果：
```json
{
  "type": "ActionExecutionResult",
  "actionExecutionId": "exec-1",
  "actionName": "send_email",
  "result": "邮件发送成功。"
}
```

##### 3. Agent 状态事件

**AgentStateMessage** - Agent 状态更新：
```json
{
  "type": "AgentStateMessage",
  "threadId": "thread-abc-123",
  "agentName": "email_agent",
  "nodeName": "email_node",
  "runId": "run-456",
  "active": true,
  "role": "assistant",
  "state": "{\"lastEmailSent\":\"jane@example.com\"}",
  "running": true
}
```

##### 4. 元事件

**MetaEvent** - 特殊的控制事件（如中断）：
```json
{
  "type": "MetaEvent",
  "name": "LangGraphInterruptEvent",
  "value": {
    "interruptType": "user_input_required",
    "message": "需要用户确认"
  }
}
```

#### 完整的流式响应示例

```json
{"type": "TextMessageStart", "messageId": "msg-2"}
{"type": "TextMessageContent", "messageId": "msg-2", "content": "好的，我将发送一封邮件。"}
{"type": "TextMessageEnd", "messageId": "msg-2"}
{"type": "ActionExecutionStart", "actionExecutionId": "exec-1", "actionName": "send_email", "parentMessageId": "msg-2"}
{"type": "ActionExecutionArgs", "actionExecutionId": "exec-1", "args": "{\"to\":\"jane@example.com\",\"body\":\"hello\"}"}
{"type": "ActionExecutionEnd", "actionExecutionId": "exec-1"}
{"type": "ActionExecutionResult", "actionExecutionId": "exec-1", "actionName": "send_email", "result": "邮件发送成功。"}
{"type": "AgentStateMessage", "threadId": "thread-abc-123", "agentName": "email_agent", "nodeName": "email_node", "runId": "run-456", "active": false, "role": "assistant", "state": "{\"lastEmailSent\":\"jane@example.com\"}", "running": false}
```

### 4. 获取 Agent 状态

客户端可以查询特定 agent 在某个对话线程中的状态。

**请求:** `POST /agent/email_agent/state`

```json
{
  "threadId": "thread-abc-123",
  "properties": {
    "userId": "user-12345"
  }
}
```

**响应:** `200 OK`

```json
{
  "threadId": "thread-abc-123",
  "threadExists": true,
  "state": {
    "lastEmailSent": "jane@example.com",
    "emailCount": 1
  },
  "messages": [
    {
      "id": "msg-1",
      "type": "TextMessage",
      "role": "user",
      "content": "给 jane@example.com 发一封邮件，内容是 hello"
    },
    {
      "id": "msg-2",
      "type": "TextMessage",
      "role": "assistant",
      "content": "好的，我将发送一封邮件。"
    }
  ]
}
```

## 实际应用场景示例

基于 CopilotKit 的 examples 目录，以下是一些实际应用场景的 API 交互模式：

### 场景 1：数据仪表板分析 (Chat with Your Data)

**应用描述**：AI 驱动的数据分析助手，用户可以通过自然语言查询数据。

**主要 Actions**：
- `searchInternet` - 搜索互联网信息
- `analyzeData` - 分析仪表板数据
- `generateChart` - 生成图表

**典型交互流程**：
```json
// 1. 发现可用功能
POST /info

// 2. 执行数据分析
POST /action/analyzeData
{
  "arguments": {
    "query": "显示本月销售趋势",
    "dataType": "sales"
  }
}

// 3. 生成图表
POST /action/generateChart
{
  "arguments": {
    "chartType": "line",
    "data": "sales_data",
    "timeRange": "monthly"
  }
}
```

### 场景 2：表单智能填写 (Form Filling)

**应用描述**：AI 助手通过对话帮助用户填写复杂表单。

**主要 Actions**：
- `fillIncidentReportForm` - 填写事件报告表单
- `validateFormData` - 验证表单数据
- `submitForm` - 提交表单

**典型交互流程**：
```json
// 1. 智能表单填写
POST /action/fillIncidentReportForm
{
  "arguments": {
    "fullName": "张三",
    "email": "zhangsan@example.com",
    "incidentDescription": "系统登录失败",
    "date": "2024-01-15",
    "incidentLevel": "high"
  }
}
```

### 场景 3：旅行规划 (Travel Planning)

**应用描述**：智能旅行规划助手，帮助用户规划行程。

**主要 Agent**：`travel_agent`

**典型交互流程**：
```json
// 1. 执行旅行规划 agent
POST /agent/travel_agent
{
  "threadId": "travel-session-123",
  "state": {
    "destination": null,
    "budget": null,
    "dates": null
  },
  "messages": [
    {
      "id": "msg-1",
      "type": "TextMessage",
      "role": "user",
      "content": "我想规划一次去东京的旅行"
    }
  ],
  "actions": [
    {
      "name": "search_places",
      "description": "搜索旅行地点",
      "parameters": [
        { "name": "location", "type": "string" },
        { "name": "type", "type": "string" }
      ]
    }
  ]
}
```

**流式响应示例**：
```json
{"type": "TextMessageStart", "messageId": "msg-2"}
{"type": "TextMessageContent", "messageId": "msg-2", "content": "好的！我来帮您规划东京之旅。"}
{"type": "ActionExecutionStart", "actionExecutionId": "exec-1", "actionName": "search_places"}
{"type": "ActionExecutionArgs", "actionExecutionId": "exec-1", "args": "{\"location\":\"东京\",\"type\":\"tourist_attractions\"}"}
{"type": "ActionExecutionResult", "actionExecutionId": "exec-1", "actionName": "search_places", "result": "找到了东京塔、浅草寺等景点"}
{"type": "TextMessageContent", "messageId": "msg-2", "content": "为您找到了以下热门景点..."}
{"type": "TextMessageEnd", "messageId": "msg-2"}
```

### 场景 4：AI 研究助手 (AI Researcher)

**应用描述**：基于搜索的 AI 研究助手，帮助用户进行信息研究。

**主要 Actions**：
- `search_tavily` - 使用 Tavily 搜索
- `analyze_content` - 分析内容
- `generate_summary` - 生成摘要

**典型交互流程**：
```json
// 1. 执行研究任务
POST /agent/research_agent
{
  "threadId": "research-session-456",
  "messages": [
    {
      "id": "msg-1",
      "type": "TextMessage", 
      "role": "user",
      "content": "研究一下人工智能在医疗领域的最新进展"
    }
  ]
}
```

### 场景 5：动态 SaaS 仪表板 (Dynamic SaaS Dashboard)

**应用描述**：企业级 SaaS 仪表板，支持多角色用户（开发者、测试者、管理员）。

**主要 Actions**：
- `fetchData_allPRData` - 获取所有 PR 数据
- `renderData_PieChart` - 渲染饼图
- `renderData_BarChart` - 渲染柱状图
- `testing_agent` - 测试代理

**典型交互流程**：
```json
// 1. 获取 PR 数据
POST /action/fetchData_allPRData
{
  "arguments": {}
}

// 2. 渲染数据可视化
POST /action/renderData_PieChart
{
  "arguments": {
    "items": [
      {
        "name": "approved",
        "shortName": "已批准",
        "value": 25,
        "color": "rgb(134 239 172)"
      },
      {
        "name": "in_review", 
        "shortName": "审核中",
        "value": 15,
        "color": "rgb(216 180 254)"
      }
    ]
  }
}

// 3. 执行测试代理
POST /agent/testing_agent
{
  "threadId": "test-session-789",
  "messages": [
    {
      "id": "msg-1",
      "type": "TextMessage",
      "role": "user", 
      "content": "为 PR #123 生成测试用例"
    }
  ]
}
```

### 场景 6：状态机对话 (State Machine Copilot)

**应用描述**：基于状态机的复杂对话流程，如汽车销售流程。

**状态流转**：
1. 联系信息收集
2. 汽车选择
3. 融资选项
4. 支付处理
5. 订单确认

**典型交互流程**：
```json
// 1. 开始销售流程
POST /agent/car_sales_agent
{
  "threadId": "sales-session-999",
  "state": {
    "currentStage": "contact_info",
    "customerInfo": {},
    "selectedCar": null,
    "financingOption": null
  },
  "messages": [
    {
      "id": "msg-1",
      "type": "TextMessage",
      "role": "user",
      "content": "我想买一辆车"
    }
  ]
}
```

**状态更新事件**：
```json
{"type": "AgentStateMessage", "threadId": "sales-session-999", "agentName": "car_sales_agent", "nodeName": "contact_info", "state": "{\"currentStage\":\"contact_info\",\"progress\":0.2}"}
```

## 流式事件处理建议

在客户端处理流式事件时，建议：

1. **按事件类型分组处理**：根据 `type` 字段分别处理不同类型的事件
2. **使用 ID 关联事件**：通过 `messageId` 和 `actionExecutionId` 关联相关事件
3. **处理增量更新**：`TextMessageContent` 和 `ActionExecutionArgs` 事件可能有多个，需要累积处理
4. **监听结束事件**：`TextMessageEnd` 和 `ActionExecutionEnd` 标志着相应流的结束
5. **处理状态更新**：`AgentStateMessage` 提供 agent 的实时状态信息
6. **响应元事件**：`MetaEvent` 可能需要特殊处理，如用户交互或中断处理

## 错误处理示例

### Action 执行失败

**请求:** `POST /action/nonexistent_action`

**响应:** `404 Not Found`
```json
{
  "error": "Action 'nonexistent_action' not found"
}
```

### Agent 执行错误

**请求:** `POST /agent/invalid_agent`

**响应:** `500 Internal Server Error`
```json
{
  "error": "Agent execution failed: Invalid agent configuration"
}
```

### 流式响应中的错误事件

```json
{"type": "ActionExecutionResult", "actionExecutionId": "exec-1", "actionName": "send_email", "result": "{\"error\": \"SMTP server unavailable\", \"isError\": true}"}
```

## 最佳实践

1. **连接管理**：使用连接池管理 HTTP 连接
2. **错误重试**：实现指数退避重试机制
3. **流式处理**：使用流式解析器处理 NDJSON 响应
4. **状态同步**：定期同步 agent 状态以确保一致性
5. **资源清理**：及时关闭不再使用的连接和流
6. **监控日志**：记录 API 调用和响应时间用于监控 