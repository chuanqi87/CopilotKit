import { NextRequest } from "next/server";
import {
  CopilotRuntime,
  LangGraphHttpAgent,
  copilotRuntimeNextJSAppRouterEndpoint,
  ExperimentalEmptyAdapter,
  // uncomment this if you want to use LangGraph Platform
  // langGraphPlatformEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";

const serviceAdapter = new ExperimentalEmptyAdapter();

const runtime = new CopilotRuntime({
  agents: {
      'sample_agent': new LangGraphHttpAgent({url: process.env.REMOTE_ACTION_URL || "http://localhost:8000/agent-ui"}),
      'agui_agent': new HttpAgent({url: process.env.REMOTE_ACTION_URL || "http://localhost:8000/agui"}),

    },
  // remoteEndpoints: [
  //   // Uncomment this if you want to use LangGraph JS, make sure to
  //   // remove the remote action url below too.
  //   {
  //     url: process.env.REMOTE_ACTION_URL || "http://localhost:8000/copilotkit",
  //   },
  // ],
});

export const POST = async (req: NextRequest) => {
  console.log("🚀 [UI] Received POST request to /api/copilotkit");
  console.log("🔧 [UI] REMOTE_ACTION_URL:", process.env.REMOTE_ACTION_URL || "http://localhost:8000/copilotkit");
  
  try {
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter,
      endpoint: "/api/copilotkit",
    });

    console.log("⏳ [UI] Calling handleRequest...");
    const response = await handleRequest(req);
    console.log("✅ [UI] handleRequest completed successfully");
    console.log("📤 [UI] Response status:", response.status);
    
    return response;
  } catch (error) {
    console.error("❌ [UI] Error handling request:", error);
    throw error;
  }
};
