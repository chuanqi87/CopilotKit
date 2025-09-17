import json
import time
import asyncio
import os
from fastapi import Request
from fastapi.responses import StreamingResponse
from .http_logging import log_info


async def a2a_mock(request: Request):
    # 解析请求体获取RunAgentInput参数
    body = await request.json()
    method = body.get("method", "")
    params = body.get("params", {})
    
    log_info(f"🔵 方法: {method}")
    log_info(f"🔵 参数: {params}")
    
    async def generate_a2a_events():
        """生成a2a协议格式的SSE事件流"""
        try:
            # 获取products.txt文件的路径
            current_dir = os.path.dirname(os.path.abspath(__file__))
            products_file_path = os.path.join(current_dir, "products.txt")
            
            log_info(f"📁 当前目录: {current_dir}")
            log_info(f"📄 文件路径: {products_file_path}")
            
            # 检查文件是否存在
            if not os.path.exists(products_file_path):
                log_info(f"❌ 文件不存在: {products_file_path}")
                # 列出当前目录的文件，帮助调试
                try:
                    files_in_dir = os.listdir(current_dir)
                    log_info(f"📋 当前目录文件列表: {files_in_dir}")
                except Exception as e:
                    log_info(f"❌ 无法列出目录文件: {e}")
                return
            
            # 按行读取文件内容并发送
            with open(products_file_path, 'r', encoding='utf-8') as file:
                for line_number, line in enumerate(file, 1):
                    line = line.strip()  # 去除行末的换行符和空格
                    
                    # 跳过空行
                    if not line:
                        continue
                    
                    log_info(f"📤 发送第 {line_number} 行数据")
                    
                    # 发送当前行的数据
                    yield f"data: {line}\n\n"
                    
                    # 等待0.3秒
                    await asyncio.sleep(0.3)
            
            log_info("✅ 所有数据发送完成")
            
        except Exception as e:
            log_info(f"❌ 读取文件时发生错误: {str(e)}")
            # 发送错误信息
            error_data = {
                "jsonrpc": "2.0",
                "id": "error",
                "error": {"code": -1, "message": f"读取文件错误: {str(e)}"}
            }
            yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
            
    return StreamingResponse(
        generate_a2a_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive", 
            "X-Accel-Buffering": "no"
        }
    )