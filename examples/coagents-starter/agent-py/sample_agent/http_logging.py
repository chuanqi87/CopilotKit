"""
HTTP请求响应日志记录模块
提供FastAPI应用的详细日志记录功能，包括流式响应处理
"""

import json
import time
import logging
from fastapi import Request, Response
from fastapi.responses import StreamingResponse


def setup_http_logger():
    """配置HTTP接口日志记录器"""
    # 配置HTTP接口日志 - 单独记录
    http_logger = logging.getLogger('http_interface')
    http_logger.setLevel(logging.INFO)

    # 创建控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))

    # 添加处理器
    http_logger.addHandler(console_handler)

    # 防止日志传播到root logger
    http_logger.propagate = False
    
    return http_logger


# 创建全局日志记录器实例
http_logger = setup_http_logger()


def _is_streaming_response(response: Response) -> bool:
    """判断是否为流式响应"""
    content_type = response.headers.get("content-type", "").lower()
    return (
        "text/event-stream" in content_type or
        "application/stream+json" in content_type or
        "text/stream" in content_type or
        isinstance(response, StreamingResponse)
    )


async def _log_streaming_response(response: Response, request_start_time: float) -> Response:
    """记录流式响应内容"""
    if not hasattr(response, 'body_iterator') or not _is_streaming_response(response):
        return response
    
    http_logger.info("🌊 === 检测到流式响应 ===")
    http_logger.info(f"🌊 Content-Type: {response.headers.get('content-type', 'unknown')}")
    
    chunk_count = 0
    total_bytes = 0
    
    async def log_and_forward_chunks():
        nonlocal chunk_count, total_bytes
        
        try:
            async for chunk in response.body_iterator:
                chunk_count += 1
                chunk_size = len(chunk) if isinstance(chunk, bytes) else len(str(chunk).encode())
                total_bytes += chunk_size
                
                # 记录数据块信息
                if isinstance(chunk, bytes):
                    try:
                        chunk_str = chunk.decode('utf-8', errors='ignore').strip()
                        http_logger.info(f"🌊 数据块[{chunk_count}] ({chunk_size}字节): {chunk_str}")
                    except Exception:
                        http_logger.info(f"🌊 数据块[{chunk_count}] ({chunk_size}字节): <二进制数据>")
                else:
                    chunk_str = str(chunk)
                    http_logger.info(f"🌊 数据块[{chunk_count}] ({chunk_size}字节): {chunk_str}")

                yield chunk
                
        except Exception as e:
            http_logger.error(f"🌊 流式响应错误: {str(e)}")
            raise
        finally:
            process_time = time.time() - request_start_time
            http_logger.info(f"🌊 流式响应完成: {chunk_count}块, {total_bytes}字节, 耗时{process_time:.3f}秒")
    
    # 创建新的流式响应
    return StreamingResponse(
        log_and_forward_chunks(),
        status_code=response.status_code,
        headers=dict(response.headers),
        media_type=response.headers.get("content-type")
    )


async def log_requests_middleware(request: Request, call_next):
    """记录HTTP接口请求和响应的中间件函数"""
    start_time = time.time()
    
    # 记录请求信息
    http_logger.info("🔵" + "=" * 60)
    http_logger.info(f"🔵 {request.method} {request.url.path}")
    http_logger.info(f"🔵 客户端: {request.client.host if request.client else 'unknown'}")
    
    # 记录查询参数
    if request.query_params:
        http_logger.info(f"🔵 查询参数: {dict(request.query_params)}")
    
    # 检查是否为流式请求
    accept_header = request.headers.get('accept', '')
    if 'text/event-stream' in accept_header:
        http_logger.info("🔵 请求流式响应 (SSE)")
    
    # 记录请求体
    if request.method in ["POST", "PUT", "PATCH"]:
        try:
            body = await request.body()
            if body:
                try:
                    body_json = json.loads(body.decode('utf-8'))
                    http_logger.info(f"🔵 请求体: {json.dumps(body_json, ensure_ascii=False, default=str)}")
                except:
                    body_text = body.decode('utf-8', errors='ignore')
                    http_logger.info(f"🔵 请求体: {body_text}")
                
                # 重新构建请求对象，因为body只能读取一次
                scope = request.scope.copy()
                receive = lambda: {"type": "http.request", "body": body, "more_body": False}
                request = Request(scope, receive)
        except Exception as e:
            http_logger.error(f"🔵 请求体读取失败: {str(e)}")
    
    # 处理请求
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # 记录响应基本信息
        http_logger.info(f"🟢 响应: {response.status_code} ({process_time:.3f}s)")
        
        content_type = response.headers.get("content-type", "")
        if content_type:
            http_logger.info(f"🟢 Content-Type: {content_type}")
        
        # 检查并处理流式响应
        if _is_streaming_response(response):
            http_logger.info("🟢 开始处理流式响应")
            response = await _log_streaming_response(response, start_time)
            return response
        
        # 处理普通JSON响应
        elif "application/json" in content_type:
            try:
                response_body = b""
                async for chunk in response.body_iterator:
                    response_body += chunk
                
                if response_body:
                    response_text = response_body.decode('utf-8', errors='ignore')
                    http_logger.info(f"🟢 响应体: {response_text}")
                    
                    # 重新创建响应
                    response = Response(
                        content=response_body,
                        status_code=response.status_code,
                        headers=dict(response.headers),
                        media_type=content_type
                    )
            except Exception as e:
                http_logger.error(f"🟢 响应体读取失败: {str(e)}")
        
        http_logger.info("🟢" + "=" * 60)
        return response
        
    except Exception as e:
        process_time = time.time() - start_time
        http_logger.error(f"🔴 请求处理失败: {type(e).__name__}: {str(e)}")
        http_logger.error(f"🔴 耗时: {process_time:.3f}秒")
        
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "message": str(e)}
        )


def log_info(message: str):
    """记录信息级别日志"""
    http_logger.info(message)


def log_error(message: str):
    """记录错误级别日志"""
    http_logger.error(message) 