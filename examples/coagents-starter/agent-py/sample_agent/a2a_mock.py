import json
import time
import asyncio
from fastapi import Request
from fastapi.responses import StreamingResponse
from .http_logging import log_info


async def a2a_mock(request: Request):
    
    # 解析请求体获取RunAgentInput参数
    body = await request.json()
    run_id = body.get("runId", f"run_{int(time.time())}")
    messages = body.get("messages", [])
    thread_id = body.get("threadId", f"thread_{int(time.time())}")
    
    log_info(f"🔵 运行ID: {run_id}")
    log_info(f"🔵 线程ID: {thread_id}")
    log_info(f"🔵 消息数量: {len(messages)}")
    
    async def generate_a2a_events():
        """生成a2a协议格式的SSE事件流"""
        try:
            # 1. 运行开始事件
            yield f"data: {json.dumps({'type': 'RUN_STARTED', 'runId': run_id, 'threadId': thread_id}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.5)
            
            # 3. 文本消息开始事件
            message_id = f"msg_{int(time.time())}"
            yield f"data: {json.dumps({'type': 'TEXT_MESSAGE_START', 'messageId': message_id, 'role': 'assistant'}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.3)
            
            # 4. 流式返回消息内容 - 模拟逐字返回
            full_message = """你好！我是AI助手，很高兴为你服务。我可以帮助你"""

            for i, char in enumerate(full_message):
                yield f"data: {json.dumps({'type': 'TEXT_MESSAGE_CONTENT', 'messageId': message_id, 'delta': char}, ensure_ascii=False)}\n\n"
                # 模拟打字机效果，中文字符间隔稍长
                await asyncio.sleep(0.1 if ord(char) > 127 else 0.05)
            
            await asyncio.sleep(0.5)

            # 5. 文本消息结束事件
            yield f"data: {json.dumps({'type': 'TEXT_MESSAGE_END', 'messageId': message_id}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.3)

            tool_id = f"msg_{int(time.time())}"
            yield f"data: {json.dumps({'type': 'TOOL_CALL_START','toolCallName':'setThemeColor', 'toolCallId': tool_id}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.3)
            yield f"data: {json.dumps({'type': 'TOOL_CALL_ARGS','delta':"{\"themeColor\":\"#008000\"}", 'toolCallId': tool_id}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.3)
            yield f"data: {json.dumps({'type': 'TOOL_CALL_END', 'toolCallId': tool_id}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.3)
            # 7. 运行结束事件
            yield f"data: {json.dumps({'type': 'RUN_FINISHED', 'threadId': thread_id, 'runId': run_id, 'status': 'completed'}, ensure_ascii=False)}\n\n"
            
        except Exception as e:
            # 发送错误事件
            error_event = {
                'type': 'run_error', 
                'run_id': run_id,
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': str(e),
                    'timestamp': time.time()
                }
            }
            yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        generate_agui_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive", 
            "X-Accel-Buffering": "no"
        }
    )