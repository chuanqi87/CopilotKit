"""
This serves the "sample_agent" agent. This is an example of self-hosting an agent
through our FastAPI integration. However, you can also host in LangGraph platform.
"""

import os
import json
import time
import asyncio
from dotenv import load_dotenv
load_dotenv() # pylint: disable=wrong-import-position

from fastapi import FastAPI, Request
import uvicorn
from sample_agent.agent import graph
from fastapi.middleware.cors import CORSMiddleware
from ag_ui_langgraph import add_langgraph_fastapi_endpoint 
from copilotkit import LangGraphAGUIAgent 

# 导入日志模块
from .http_logging import log_requests_middleware, log_info, log_error
from .agui_mock import agui_mock

app = FastAPI()

# 配置请求日志中间件
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """HTTP请求日志中间件"""
    return await log_requests_middleware(request, call_next)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint for Render."""
    return {"status": "healthy", "service": "copilotkit-agent-py"}

# 配置 LangGraph FastAPI 端点
log_info("🚀 FastAPI应用启动")

add_langgraph_fastapi_endpoint(
  app=app,
  agent=LangGraphAGUIAgent(
    name="sample_agent", # the name of your agent defined in langgraph.json
    description="An example agent to use as a starting point for your own agent.",
    graph=graph, # the graph object from your langgraph import
  ),
  path="/agent-ui", # the endpoint you'd like to serve your agent on
)

# 测试ag-ui协议实现
@app.post("/agui")
async def agui_handler(request: Request):
    log_info("🚀 接口调用: /agui")
    return await agui_mock(request)

log_info("🚀 LangGraph端点配置完成: /agent-ui")

def main():
    """Run the uvicorn server."""
    port = int(os.getenv("PORT", "8000"))
    log_info(f"🚀 启动HTTP服务器，端口: {port}")
    
    uvicorn.run(
        "sample_agent.demo:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )
