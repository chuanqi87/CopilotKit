import {
  CopilotRuntimeClient,
  CopilotRuntimeClientOptions,
  GraphQLError,
} from "@copilotkit/runtime-client-gql";
import { AGUIDirectClient } from "../lib/AGUIDirectClient";
import { useToast } from "../components/toast/toast-provider";
import { useMemo, useRef } from "react";
import {
  ErrorVisibility,
  CopilotKitApiDiscoveryError,
  CopilotKitRemoteEndpointDiscoveryError,
  CopilotKitAgentDiscoveryError,
  CopilotKitError,
  CopilotKitErrorCode,
  CopilotErrorHandler,
  CopilotErrorEvent,
} from "@copilotkit/shared";
import { shouldShowDevConsole } from "../utils/dev-console";

export interface CopilotRuntimeClientHookOptions extends CopilotRuntimeClientOptions {
  showDevConsole?: boolean;
  onError?: CopilotErrorHandler;
  aguiUrl?: string; // 添加 AGUI URL 支持
}

export const useCopilotRuntimeClient = (options: CopilotRuntimeClientHookOptions) => {
  const { setBannerError } = useToast();
  const { showDevConsole, onError, aguiUrl, ...runtimeOptions } = options;

  // Deduplication state for structured errors
  const lastStructuredErrorRef = useRef<{ message: string; timestamp: number } | null>(null);

  // Helper function to trace UI errors
  const traceUIError = async (error: CopilotKitError, originalError?: any) => {
    // Just check if onError and publicApiKey are defined
    if (!onError || !runtimeOptions.publicApiKey) return;

    try {
      const errorEvent: CopilotErrorEvent = {
        type: "error",
        timestamp: Date.now(),
        context: {
          source: "ui",
          request: {
            operation: "runtimeClient",
            url: runtimeOptions.url,
            startTime: Date.now(),
          },
          technical: {
            environment: "browser",
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
            stackTrace: originalError instanceof Error ? originalError.stack : undefined,
          },
        },
        error,
      };
      await onError(errorEvent);
    } catch (error) {
      console.error("Error in onError handler:", error);
    }
  };

  const runtimeClient = useMemo(() => {
    // 🔄 如果提供了 aguiUrl，使用 AGUIDirectClient
    if (aguiUrl) {
      console.log('[CopilotKit] 🚀 选择AGUIDirectClient作为运行时客户端', {
        aguiUrl,
        hasHeaders: !!(runtimeOptions.headers && Object.keys(runtimeOptions.headers).length > 0),
        credentials: runtimeOptions.credentials,
        showDevConsole: showDevConsole ?? false
      });
      
      return new AGUIDirectClient({
        aguiUrl,
        headers: runtimeOptions.headers || {},
        credentials: runtimeOptions.credentials,
        handleGQLErrors: (error) => {
          // AG-UI 模式的错误处理
          const isDev = shouldShowDevConsole(showDevConsole ?? false);
          if (!isDev) {
            console.error("AG-UI Error (hidden in production):", error);
          } else {
            const fallbackError = new CopilotKitError({
              message: error?.message || String(error),
              code: CopilotKitErrorCode.UNKNOWN,
            });
            setBannerError(fallbackError);
            traceUIError(fallbackError, error);
          }
        },
        handleGQLWarning: (message: string) => {
          console.warn(message);
          const warningError = new CopilotKitError({
            message,
            code: CopilotKitErrorCode.UNKNOWN,
          });
          setBannerError(warningError);
        },
      }) as any; // 使用类型断言以避免类型检查问题
    }

    // 📡 默认使用 CopilotRuntimeClient
    console.log('[CopilotKit] 📡 选择CopilotRuntimeClient作为运行时客户端', {
      url: runtimeOptions.url,
      publicApiKey: runtimeOptions.publicApiKey ? '已设置' : '未设置',
      hasHeaders: !!(runtimeOptions.headers && Object.keys(runtimeOptions.headers).length > 0),
      credentials: runtimeOptions.credentials,
      showDevConsole: showDevConsole ?? false
    });
    
    return new CopilotRuntimeClient({
      ...runtimeOptions,
      handleGQLErrors: (error) => {
        if ((error as any).graphQLErrors?.length) {
          const graphQLErrors = (error as any).graphQLErrors as GraphQLError[];

          // Route all errors to banners for consistent UI
          const routeError = (gqlError: GraphQLError) => {
            const extensions = gqlError.extensions;
            const visibility = extensions?.visibility as ErrorVisibility;
            const isDev = shouldShowDevConsole(showDevConsole ?? false);

            // Silent errors - just log
            if (visibility === ErrorVisibility.SILENT) {
              console.error("CopilotKit Silent Error:", gqlError.message);
              return;
            }

            if (!isDev) {
              console.error("CopilotKit Error (hidden in production):", gqlError.message);
              return;
            }

            // All errors (including DEV_ONLY) show as banners for consistency
            // Deduplicate to prevent spam
            const now = Date.now();
            const errorMessage = gqlError.message;
            if (
              lastStructuredErrorRef.current &&
              lastStructuredErrorRef.current.message === errorMessage &&
              now - lastStructuredErrorRef.current.timestamp < 150
            ) {
              return; // Skip duplicate
            }
            lastStructuredErrorRef.current = { message: errorMessage, timestamp: now };

            const ckError = createStructuredError(gqlError);
            if (ckError) {
              setBannerError(ckError);
              // Trace the error
              traceUIError(ckError, gqlError);
            } else {
              // Fallback for unstructured errors
              const fallbackError = new CopilotKitError({
                message: gqlError.message,
                code: CopilotKitErrorCode.UNKNOWN,
              });
              setBannerError(fallbackError);
              // Trace the fallback error
              traceUIError(fallbackError, gqlError);
            }
          };

          // Process all errors as banners
          graphQLErrors.forEach(routeError);
        } else {
          const isDev = shouldShowDevConsole(showDevConsole ?? false);
          if (!isDev) {
            console.error("CopilotKit Error (hidden in production):", error);
          } else {
            // Route non-GraphQL errors to banner as well
            const fallbackError = new CopilotKitError({
              message: error?.message || String(error),
              code: CopilotKitErrorCode.UNKNOWN,
            });
            setBannerError(fallbackError);
            // Trace the non-GraphQL error
            traceUIError(fallbackError, error);
          }
        }
      },
      handleGQLWarning: (message: string) => {
        console.warn(message);
        // Show warnings as banners too for consistency
        const warningError = new CopilotKitError({
          message,
          code: CopilotKitErrorCode.UNKNOWN,
        });
        setBannerError(warningError);
      },
    });
  }, [runtimeOptions, setBannerError, showDevConsole, onError, aguiUrl]);

  return runtimeClient;
};

// Create appropriate structured error from GraphQL error
function createStructuredError(gqlError: GraphQLError): CopilotKitError | null {
  const extensions = gqlError.extensions;
  const originalError = extensions?.originalError as any;
  const message = originalError?.message || gqlError.message;
  const code = extensions?.code as CopilotKitErrorCode;

  if (code) {
    return new CopilotKitError({ message, code });
  }

  // Legacy error detection by stack trace
  if (originalError?.stack?.includes("CopilotApiDiscoveryError")) {
    return new CopilotKitApiDiscoveryError({ message });
  }
  if (originalError?.stack?.includes("CopilotKitRemoteEndpointDiscoveryError")) {
    return new CopilotKitRemoteEndpointDiscoveryError({ message });
  }
  if (originalError?.stack?.includes("CopilotKitAgentDiscoveryError")) {
    return new CopilotKitAgentDiscoveryError({
      agentName: "",
      availableAgents: [],
    });
  }

  return null;
}

/**
 * 🏭 创建运行时客户端的工厂函数
 * 用于在非hook环境中创建合适的运行时客户端
 */
export function createRuntimeClient(options: CopilotRuntimeClientOptions & { aguiUrl?: string; }) {
  const { aguiUrl, ...runtimeOptions } = options;

  // 🔄 如果提供了 aguiUrl，使用 AGUIDirectClient
  if (aguiUrl) {
    console.log('[CopilotKit] 🚀 工厂函数选择AGUIDirectClient', { aguiUrl });
    
    return new AGUIDirectClient({
      aguiUrl,
      headers: runtimeOptions.headers || {},
      credentials: runtimeOptions.credentials,
      handleGQLErrors: (error) => {
        console.error("AG-UI Error:", error);
      },
      handleGQLWarning: (message: string) => {
        console.warn("AG-UI Warning:", message);
      },
    }) as any;
  }

  // 📡 默认使用 CopilotRuntimeClient
  console.log('[CopilotKit] 📡 工厂函数选择CopilotRuntimeClient', {
    url: runtimeOptions.url
  });
  
  return new CopilotRuntimeClient(runtimeOptions);
}
