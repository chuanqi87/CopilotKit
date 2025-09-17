/**
 * AGUIDirectClient - CopilotKit 直接对接 AG-UI 协议适配器
 * 
 * 这个类完全兼容 CopilotRuntimeClient 的接口，但直接使用 AG-UI 协议
 * 通过 ag-ui HttpAgent 实现零转换的高性能数据传输
 */

import {
  MessageRole,
  GenerateCopilotResponseMutationVariables,
  MessageStatusCode,
} from "@copilotkit/runtime-client-gql";

// 导入 ag-ui 相关类型和客户端
import { HttpAgent } from "@ag-ui/client";
import type { 
  Message as AGUIMessage, 
  RunAgentInput,
  BaseEvent,
  Tool,
  Context,
  TextMessageStartEvent,
  TextMessageContentEvent,
  ToolCallStartEvent,
  ToolCallResultEvent,
  RunFinishedEvent
} from "@ag-ui/core";
import { EventType } from "@ag-ui/core";

// 客户端配置选项 - 完全兼容 CopilotRuntimeClientOptions
export interface AGUIDirectClientOptions {
  aguiUrl: string;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  handleGQLErrors?: (error: Error) => void;
  handleGQLWarning?: (warning: string) => void;
}

/**
 * AGUIDirectClient - 完全兼容 CopilotRuntimeClient 的 AG-UI 协议客户端
 */
export class AGUIDirectClient {
  public handleGQLErrors?: (error: Error) => void;
  public handleGQLWarning?: (warning: string) => void;

  private options: AGUIDirectClientOptions;
  private httpAgent: HttpAgent;
  private currentAbortController?: AbortController;

  constructor(options: AGUIDirectClientOptions) {
    this.options = options;
    this.handleGQLErrors = options.handleGQLErrors;
    this.handleGQLWarning = options.handleGQLWarning;
    
    this.log('🚀 AGUIDirectClient 初始化', {
      aguiUrl: options.aguiUrl,
      headers: Object.keys(options.headers || {})
    });
    
    // 创建 HttpAgent 实例
    this.httpAgent = new HttpAgent({
      url: options.aguiUrl,
      headers: options.headers || {},
    });
    
    this.log('✅ HttpAgent 创建完成', { url: options.aguiUrl });
  }

  /**
   * 🚀 生成 Copilot 响应 - 完全兼容 CopilotRuntimeClient.generateCopilotResponse
   */
  generateCopilotResponse({
    data,
    properties,
    signal,
  }: {
    data: GenerateCopilotResponseMutationVariables["data"];
    properties?: GenerateCopilotResponseMutationVariables["properties"];
    signal?: AbortSignal;
  }) {
    const handleGQLErrors = this.handleGQLErrors;
    
    // 返回兼容的 Observable 对象
    return {
      subscribe: (callback: (result: { data?: any; error?: any; hasNext?: boolean }) => void) => {
        this.processAGUIStream(data, properties, signal, callback);
        return { unsubscribe: () => this.currentAbortController?.abort() };
      },
      toPromise: () => this.processAGUIPromise(data, properties, signal)
    };
  }

  /**
   * 🌊 asStream - 完全兼容 CopilotRuntimeClient.asStream
   */
  public asStream<S, T>(source: any) {
    const handleGQLErrors = this.handleGQLErrors;
    
    return new ReadableStream<S>({
      start(controller) {
        source.subscribe(({ data, hasNext, error }: any) => {
          if (error) {
            // 处理中断错误
            if (
              error.message.includes("BodyStreamBuffer was aborted") ||
              error.message.includes("signal is aborted without reason")
            ) {
              if (!hasNext) controller.close();
              console.warn("Abort error suppressed");
              return;
            }

            // 处理结构化错误
            if ((error as any).extensions?.visibility) {
              const syntheticError = {
                ...error,
                graphQLErrors: [
                  {
                    message: error.message,
                    extensions: (error as any).extensions,
                  },
                ],
              };

              if (handleGQLErrors) {
                handleGQLErrors(syntheticError);
              }
              return;
            }

            controller.error(error);
            if (handleGQLErrors) {
              handleGQLErrors(error);
            }
          } else {
            controller.enqueue(data);
            if (!hasNext) {
              controller.close();
            }
          }
        });
      },
    });
  }

  /**
   * 🤖 获取可用代理 - 完全兼容 CopilotRuntimeClient.availableAgents
   */
  availableAgents() {
    this.log('🤖 获取可用代理列表');
    
    return {
      toPromise: async () => {
        try {
          const url = `${this.options.aguiUrl}/agents`;
          this.log('📞 发送获取代理请求', { url });
          
          const response = await fetch(url, {
            headers: this.options.headers,
            credentials: this.options.credentials,
          });
          
          this.log('📨 收到代理响应', { 
            status: response.status, 
            ok: response.ok 
          });
          
          if (response.ok) {
            const agents = await response.json();
            this.log('✅ 成功获取代理列表', { 
              count: Array.isArray(agents) ? agents.length : 'unknown' 
            });
            return { 
              data: { availableAgents: agents },
              error: null
            };
          } else {
            this.warn('⚠️ 获取代理列表失败', { status: response.status });
            return { 
              data: { availableAgents: [] },
              error: null
            };
          }
        } catch (error) {
          this.error('❌ 获取代理列表异常', error);
          const errorResult = {
            data: null,
            error: error as Error
          };
          if (this.handleGQLErrors) {
            this.handleGQLErrors(error as Error);
          }
          return errorResult;
        }
      },
      // 直接返回兼容的同步属性
      data: null,
      error: null
    };
  }

  /**
   * 📄 加载代理状态 - 完全兼容 CopilotRuntimeClient.loadAgentState
   */
  loadAgentState(data: { threadId: string; agentName: string }) {
    const handleGQLErrors = this.handleGQLErrors;
    this.log('📄 加载代理状态', { 
      threadId: data.threadId, 
      agentName: data.agentName 
    });
    
    return {
      toPromise: async () => {
        try {
          const url = `${this.options.aguiUrl}/threads/${data.threadId}/state`;
          this.log('📞 发送状态加载请求', { url });
          
          const response = await fetch(url, {
            headers: this.options.headers,
            credentials: this.options.credentials,
          });
          
          this.log('📨 收到状态响应', { 
            status: response.status, 
            ok: response.ok 
          });
          
          if (response.ok) {
            const stateData = await response.json();
            this.log('✅ 成功加载代理状态', { 
              hasMessages: !!stateData.messages,
              messageCount: stateData.messages?.length || 0,
              keys: Object.keys(stateData)
            });
            return { 
              data: { 
                loadAgentState: {
                  messages: stateData.messages || [],
                  threadExists: true,
                  ...stateData
                }
              },
              error: null
            };
          } else {
            this.warn('⚠️ 线程不存在或加载失败', { 
              status: response.status,
              threadId: data.threadId 
            });
            return { 
              data: { 
                loadAgentState: {
                  messages: [],
                  threadExists: false
                }
              },
              error: null
            };
          }
        } catch (error) {
          this.error('❌ 加载代理状态异常', error);
          const errorResult = {
            data: null,
            error: error as Error
          };
          if (handleGQLErrors) {
            handleGQLErrors(error as Error);
          }
          return errorResult;
        }
      },
      // 直接返回兼容的同步属性
      data: null,
      error: null
    };
  }

  /**
   * 🧹 移除 GraphQL 类型名 - 完全兼容静态方法
   */
  static removeGraphQLTypename(data: any) {
    if (Array.isArray(data)) {
      data.forEach((item) => AGUIDirectClient.removeGraphQLTypename(item));
    } else if (typeof data === "object" && data !== null) {
      delete data.__typename;
      Object.keys(data).forEach((key) => {
        if (typeof data[key] === "object" && data[key] !== null) {
          AGUIDirectClient.removeGraphQLTypename(data[key]);
        }
      });
    }
    return data;
  }

  /**
   * 🔄 处理 AG-UI 流式请求 (使用 HttpAgent)
   */
  private async processAGUIStream(
    data: GenerateCopilotResponseMutationVariables["data"],
    properties: any,
    signal: AbortSignal | undefined,
    callback: (result: { data?: any; error?: any; hasNext?: boolean }) => void
  ) {
    this.log('🌊 开始处理流式请求', {
      threadId: data.threadId,
      messagesCount: data.messages.length,
      actionsCount: data.frontend?.actions?.length || 0,
      hasSignal: !!signal
    });

    try {
      // 中断之前的请求
      if (this.currentAbortController) {
        this.log('🛑 中断之前的请求');
        this.currentAbortController.abort();
      }
      
      this.currentAbortController = new AbortController();
      const abortController = signal ? 
        this.createCombinedAbortController([signal, this.currentAbortController.signal]) :
        this.currentAbortController;

      // 转换为 AG-UI RunAgentInput 格式
      const runAgentInput = this.convertToRunAgentInput(data, properties);
      this.log('🔄 数据转换完成', {
        runId: runAgentInput.runId,
        threadId: runAgentInput.threadId,
        messagesCount: runAgentInput.messages?.length,
        toolsCount: runAgentInput.tools?.length,
        contextCount: runAgentInput.context?.length
      });
      
      // 当前消息与待发送的 metaEvents（GraphQL 兼容结构）
      let currentMessages: any[] = [];
      let pendingMetaEvents: any[] = [];
      
      // 创建 AgentSubscriber 来处理事件
      const subscriber = {
        onEvent: ({ event }: { event: BaseEvent }) => {
          this.log('📨 收到AG-UI事件', { 
            type: event.type, 
            timestamp: event.timestamp,
            messageCount: currentMessages.length
          });
          currentMessages = this.processAGUIEventToMessages(event, currentMessages);
          // 仅解析 LangGraph 中断事件，转换为 GraphQL 兼容的 metaEvents
          const newMetaEvents = this.processAGUIEventToMetaEvents(event);
          if (newMetaEvents.length > 0) {
            this.log('⏸️ 侦测到 LangGraph 中断事件', { count: newMetaEvents.length });
            pendingMetaEvents.push(...newMetaEvents);
          }
          this.log('📤 发送中间结果', { 
            messageCount: currentMessages.length,
            lastMessageType: currentMessages[currentMessages.length - 1]?.__typename
          });
          callback({ 
            data: { generateCopilotResponse: { messages: currentMessages, metaEvents: pendingMetaEvents.splice(0) } }, 
            hasNext: true 
          });
        },
        onRunFinishedEvent: ({ event, result }: { event: RunFinishedEvent; result?: any }) => {
          this.log('✅ AG-UI运行完成', { 
            messageCount: currentMessages.length,
            result: result ? 'has result' : 'no result'
          });
          callback({ 
            data: { generateCopilotResponse: { messages: currentMessages, metaEvents: pendingMetaEvents.splice(0) } }, 
            hasNext: false 
          });
        },
        onRunFailed: ({ error }: { error: Error }) => {
          this.error('❌ AG-UI运行失败', error);
          callback({ error, hasNext: false });
        }
      };

      this.log('🚀 开始HttpAgent.runAgent调用');
      // 使用 HttpAgent 运行请求
      await this.httpAgent.runAgent({
        ...runAgentInput,
        abortController
      }, subscriber);
      this.log('✅ HttpAgent.runAgent调用完成');

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.warn('⚠️ 请求被用户中断');
        callback({ error: new Error('请求被中断'), hasNext: false });
      } else {
        this.error('❌ 流式请求发生错误', error);
        callback({ error: error as Error, hasNext: false });
        if (this.handleGQLErrors) {
          this.handleGQLErrors(error as Error);
        }
      }
    }
  }

  /**
   * 🔄 处理 AG-UI Promise 请求
   */
  private async processAGUIPromise(
    data: GenerateCopilotResponseMutationVariables["data"],
    properties: any,
    signal?: AbortSignal
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      let lastData: any = null;
      
      this.processAGUIStream(data, properties, signal, ({ data, error, hasNext }) => {
        if (error) {
          reject(error);
        } else if (data) {
          lastData = data;
          if (!hasNext) {
            resolve({ data: lastData });
          }
        }
      });
    });
  }

  /**
   * 🔄 转换为 AG-UI RunAgentInput 格式
   */
  private convertToRunAgentInput(
    data: GenerateCopilotResponseMutationVariables["data"],
    properties: any
  ): Partial<RunAgentInput> {
    const threadId = data.threadId || this.generateId();
    const runId = this.generateId();
    
    this.log('🔄 开始数据转换', {
      hasThreadId: !!data.threadId,
      generatedThreadId: !data.threadId ? threadId : undefined,
      runId,
      originalMessagesCount: data.messages.length,
      originalActionsCount: data.frontend?.actions?.length || 0
    });

    const convertedMessages = this.convertMessagesToAGUI(data.messages);
    const convertedTools = this.convertToolsToAGUI(data.frontend?.actions || []);
    const convertedContext = this.buildAGUIContext(data);

    // 兼容前端为“恢复中断”携带的 metaEvents（LangGraphInterruptEvent 带 response）
    let forwardedProps: any = { ...(properties || {}) };
    const lgInterruptEventWithResponse = (data.metaEvents || []).find(
      // @ts-ignore 运行时宽松判断
      (ev: any) => ev?.name === 'LangGraphInterruptEvent' && (ev as any)?.response
    ) as any | undefined;
    if (lgInterruptEventWithResponse) {
      try {
        const rawResponse = lgInterruptEventWithResponse.response;
        const parsed = this.safeParseJson(rawResponse);
        forwardedProps = {
          ...forwardedProps,
          command: { resume: parsed },
        };
        this.log('🔁 检测到恢复中断指令，已设置 forwardedProps.command.resume');
      } catch (e) {
        this.warn('⚠️ 解析中断响应失败，跳过设置 resume', { error: (e as Error)?.message });
      }
    }

    // 如果前端有带上当前节点信息（如从 useChat 的 agentSession），也一并转发
    if ((data as any)?.agentSession?.nodeName) {
      forwardedProps.nodeName = (data as any).agentSession.nodeName;
    }

    const result = {
      threadId,
      runId,
      state: {},
      messages: convertedMessages,
      tools: convertedTools,
      context: convertedContext,
      forwardedProps
    };

    this.log('✅ 数据转换完成', {
      convertedMessagesCount: convertedMessages.length,
      convertedToolsCount: convertedTools.length,
      convertedContextCount: convertedContext.length,
      hasForwardedProps: !!properties
    });

    return result;
  }

  /**
   * 🔄 转换消息格式到 AG-UI
   */
  private convertMessagesToAGUI(messages: any[]): AGUIMessage[] {
    return messages.map(msg => {
      const role = this.mapRoleToAGUI(msg.role);
      const baseMessage = {
        id: msg.id || this.generateId(),
        role: role as "user" | "assistant" | "system" | "developer" | "tool",
        content: msg.content || '',
      };
      
      // 如果是工具消息，添加必需的toolCallId属性
      if (role === 'tool') {
        return {
          ...baseMessage,
          role: 'tool' as const,
          toolCallId: msg.toolCallId || this.generateId(),
          content: msg.content || '',
        };
      }
      
      return baseMessage;
    }) as AGUIMessage[];
  }

  /**
   * 🛠️ 转换工具格式到 AG-UI
   */
  private convertToolsToAGUI(actions: any[]): Tool[] {
    return actions.map(action => ({
      name: action.name,
      description: action.description || '',
      parameters: action.parameters || { type: 'object', properties: {} }
    }));
  }

  /**
   * 🏗️ 构建 AG-UI 上下文
   */
  private buildAGUIContext(data: any): Context[] {
    const context: Context[] = [];
    
    if (data.frontend?.url) {
      context.push({
        description: 'Frontend URL',
        value: data.frontend.url,
      });
    }

    return context;
  }

  /**
   * 🧰 安全 JSON 解析
   */
  private safeParseJson(input: any): any {
    if (input == null) return input;
    if (typeof input === 'string') {
      try {
        return JSON.parse(input);
      } catch {
        return input;
      }
    }
    return input;
  }

  /**
   * 🔄 映射角色到 AG-UI 格式
   */
  private mapRoleToAGUI(role: string): string {
    switch (role) {
      case MessageRole.User:
        return 'user';
      case MessageRole.Assistant:
        return 'assistant';
      case MessageRole.System:
        return 'system';
      default:
        return 'user';
    }
  }

  /**
   * ⚡ 处理 AG-UI 事件并转换为消息格式
   */
  private processAGUIEventToMessages(event: BaseEvent, currentMessages: any[]): any[] {
    const messages = [...currentMessages];
    const originalLength = messages.length;

    switch (event.type) {
      case EventType.TEXT_MESSAGE_START:
        const textStartEvent = event as TextMessageStartEvent;
        const textMessage = {
          __typename: 'TextMessageOutput', // 🔧 修复为正确的GraphQL类型名
          id: textStartEvent.messageId,
          role: MessageRole.Assistant,
          content: [''], // 🔧 修复为字符串数组格式
          parentMessageId: null,
          status: { code: MessageStatusCode.Pending }, // 🔧 添加状态字段
          createdAt: new Date(textStartEvent.timestamp || Date.now()).toISOString(),
        };
        messages.push(textMessage);
        this.log('📝 创建文本消息', { messageId: textStartEvent.messageId });
        break;

      case EventType.TEXT_MESSAGE_CONTENT:
        const textContentEvent = event as TextMessageContentEvent;
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage.__typename === 'TextMessageOutput' && lastMessage.id === textContentEvent.messageId) {
            // 更新content数组中的最后一个元素
            if (lastMessage.content && lastMessage.content.length > 0) {
              lastMessage.content[lastMessage.content.length - 1] += textContentEvent.delta;
            } else {
              lastMessage.content = [textContentEvent.delta];
            }
            this.log('📝 追加文本内容', { 
              messageId: textContentEvent.messageId, 
              delta: textContentEvent.delta,
              totalLength: lastMessage.content.join('').length 
            });
          }
        }
        break;

      case EventType.TOOL_CALL_START:
        const toolStartEvent = event as ToolCallStartEvent;
        const actionMessage = {
          __typename: 'ActionExecutionMessageOutput', // 🔧 修复为正确的GraphQL类型名
          id: this.generateId(),
          name: toolStartEvent.toolCallName || '', // 🔧 修复：使用toolCallName而不是toolCallId
          arguments: '{}',
          parentMessageId: null,
          status: { code: MessageStatusCode.Pending },
          createdAt: new Date(toolStartEvent.timestamp || Date.now()).toISOString(),
          // 添加toolCallId用于后续事件关联
          toolCallId: toolStartEvent.toolCallId,
        };
        messages.push(actionMessage);
        this.log('🛠️ 创建工具调用消息', { 
          toolCallName: toolStartEvent.toolCallName, // 记录工具名称
          toolCallId: toolStartEvent.toolCallId,
          messageId: actionMessage.id 
        });
        break;

      case EventType.TEXT_MESSAGE_END:
        // 文本消息结束，可以更新状态为成功
        const textEndEvent = event as any;
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage.__typename === 'TextMessageOutput' && lastMessage.id === textEndEvent.messageId) {
            lastMessage.status = { code: MessageStatusCode.Success };
            this.log('✅ 文本消息完成', { messageId: textEndEvent.messageId });
          }
        }
        break;

      case EventType.TOOL_CALL_ARGS:
        // 工具调用参数的增量更新
        const toolArgsEvent = event as any;
        if (messages.length > 0) {
          // 🔧 修复：通过toolCallId查找对应的工具调用消息
          const toolMessage = messages.find(msg => 
            msg.__typename === 'ActionExecutionMessageOutput' && 
            msg.toolCallId === toolArgsEvent.toolCallId
          );
          if (toolMessage) {
            try {
              const currentArgs = JSON.parse(toolMessage.arguments || '{}');
              // 这里简化处理，实际可能需要更复杂的参数合并逻辑
              toolMessage.arguments = JSON.stringify({
                ...currentArgs,
                _delta: (currentArgs._delta || '') + toolArgsEvent.delta
              });
              this.log('📝 更新工具调用参数', { 
                toolCallId: toolArgsEvent.toolCallId,
                toolName: toolMessage.name, // 添加工具名称日志
                deltaLength: toolArgsEvent.delta?.length || 0
              });
            } catch (error) {
              this.warn('⚠️ 工具参数解析失败', { error: (error as Error).message });
            }
          } else {
            this.warn('⚠️ 未找到对应的工具调用消息', { toolCallId: toolArgsEvent.toolCallId });
          }
        }
        break;

      case EventType.TOOL_CALL_END:
        // 工具调用结束，更新状态为成功
        const toolEndEvent = event as any;
        if (messages.length > 0) {
          // 🔧 修复：通过toolCallId查找对应的工具调用消息
          const toolMessage = messages.find(msg => 
            msg.__typename === 'ActionExecutionMessageOutput' && 
            msg.toolCallId === toolEndEvent.toolCallId
          );
          if (toolMessage) {
            toolMessage.status = { code: MessageStatusCode.Success };
            this.log('✅ 工具调用完成', { 
              toolCallId: toolEndEvent.toolCallId,
              toolName: toolMessage.name // 添加工具名称日志
            });
          } else {
            this.warn('⚠️ 工具调用结束时未找到对应消息', { toolCallId: toolEndEvent.toolCallId });
          }
        }
        break;

      case EventType.TOOL_CALL_RESULT:
        const toolResultEvent = event as ToolCallResultEvent;
        const resultMessage = {
          __typename: 'ResultMessageOutput', // 🔧 修复为正确的GraphQL类型名
          id: this.generateId(),
          result: JSON.stringify(toolResultEvent),
          actionExecutionId: '',
          actionName: '',
          status: { code: MessageStatusCode.Success }, // 工具结果默认为成功状态
          createdAt: new Date(toolResultEvent.timestamp || Date.now()).toISOString(),
        };
        messages.push(resultMessage);
        this.log('🔧 创建工具结果消息', { 
          messageId: resultMessage.id,
          resultSize: resultMessage.result.length 
        });
        break;

      case EventType.RUN_FINISHED:
        // 运行完成事件，主要用于日志记录，不需要创建新消息
        this.log('🏁 AG-UI运行完成', { 
          eventData: event,
          currentMessageCount: messages.length
        });
        break;

      case EventType.RUN_STARTED:
        // 运行开始事件，主要用于日志记录
        this.log('🚀 AG-UI运行开始', { eventData: event });
        break;

      default:
        this.warn('⚠️ 未处理的事件类型', { type: event.type });
    }

    if (messages.length !== originalLength) {
      this.log('📊 消息数组更新', { 
        from: originalLength, 
        to: messages.length,
        eventType: event.type 
      });
    }

    return messages;
  }

  /**
   * ⏸️ 将 AG-UI 事件转换为 GraphQL 兼容的 LangGraph 中断 metaEvents
   * 仅解析 LangGraph 的原生中断，不处理 CopilotKit 扩展中断
   * 期望输出形如：
   *   { __typename: 'LangGraphInterruptEvent', type: 'MetaEvent', name: 'LangGraphInterruptEvent', value: string }
   */
  private processAGUIEventToMetaEvents(event: BaseEvent): any[] {
    try {
      // 来自 @ag-ui/langgraph 的中断事件映射：
      // 1) 原始流事件中可能携带 __interrupt__ 列表（兼容 langgraph 平台）
      // 2) 或者通过 OnInterrupt 事件类型传递
      // 两者我们都归一为 GraphQL 的 LangGraphInterruptEvent

      // 情况 1：事件体含有 data.__interrupt__（与 langgraph 平台一致）
      // @ts-ignore - 事件载荷格式依赖代理端实现
      const interrupts = (event as any)?.data?.__interrupt__;
      const results: any[] = [];

      if (Array.isArray(interrupts) && interrupts.length > 0) {
        for (const it of interrupts) {
          const value = typeof it?.value === 'string' ? it.value : JSON.stringify(it?.value ?? '');
          results.push({
            __typename: 'LangGraphInterruptEvent',
            type: 'MetaEvent',
            name: 'LangGraphInterruptEvent',
            value,
          });
        }
      }

      // 情况 2：事件类型显式是 OnInterrupt（@ag-ui/langgraph 暴露的枚举）
      // 为了避免引入类型依赖，使用字符串匹配
      // @ts-ignore
      if ((event as any)?.event === 'on_interrupt' || (event as any)?.type === 'on_interrupt') {
        // @ts-ignore
        const rawValue = (event as any)?.value ?? (event as any)?.data?.value;
        const value = typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue ?? '');
        results.push({
          __typename: 'LangGraphInterruptEvent',
          type: 'MetaEvent',
          name: 'LangGraphInterruptEvent',
          value,
        });
      }

      return results;
    } catch (e) {
      this.warn('⚠️ 解析 LangGraph 中断事件失败', { error: (e as Error)?.message });
      return [];
    }
  }

  /**
   * 🔗 创建组合的 AbortController
   */
  private createCombinedAbortController(signals: AbortSignal[]): AbortController {
    const controller = new AbortController();
    
    signals.forEach(signal => {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    });
    
    return controller;
  }

  /**
   * 🆔 生成唯一ID
   */
  private generateId(): string {
    return `agui_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 📝 调试日志输出
   */
  private log(message: string, data?: any): void {
    console.log(`[AGUIDirectClient] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  /**
   * ⚠️ 警告日志输出
   */
  private warn(message: string, data?: any): void {
    console.warn(`[AGUIDirectClient] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  /**
   * ❌ 错误日志输出
   */
  private error(message: string, error?: any): void {
    console.error(`[AGUIDirectClient] ${message}`, error);
  }
} 