import { NextRequest } from "next/server";
import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
  ExperimentalEmptyAdapter,
  // uncomment this if you want to use LangGraph Platform
  // langGraphPlatformEndpoint,
} from "@copilotkit/runtime";

const serviceAdapter = new ExperimentalEmptyAdapter();

const runtime = new CopilotRuntime({
  remoteEndpoints: [
    // Uncomment this if you want to use LangGraph JS, make sure to
    // remove the remote action url below too.
    //
    // langGraphPlatformEndpoint({
    //   deploymentUrl: "http://localhost:8000",
    //   langsmithApiKey: process.env.LANGSMITH_API_KEY || "", // only used in LangGraph Platform deployments
    //   agents: [
    //     {
    //       name: "sample_agent",
    //       description: "A helpful LLM agent.",
    //     },
    //   ],
    // }),
    {
      url: process.env.REMOTE_ACTION_URL || "http://localhost:8000/copilotkit",
    },
  ],
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
