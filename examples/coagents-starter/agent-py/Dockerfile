FROM langchain/langgraph-api:3.12

# 添加本地包
ADD . /deps/agent-py

# 安装依赖
RUN PYTHONDONTWRITEBYTECODE=1 uv pip install --system --no-cache-dir -c /api/constraints.txt -e /deps/*

# 修复 CopilotKit 的导入问题
RUN sed -i 's/from langgraph.graph.graph import CompiledGraph/from langgraph.graph.state import CompiledStateGraph as CompiledGraph/' /usr/local/lib/python*/site-packages/copilotkit/langgraph_agent.py

# 设置环境变量
ENV LANGSERVE_GRAPHS='{"sample_agent": "/deps/agent-py/sample_agent/agent.py:graph"}'

# 确保用户依赖没有意外覆盖 langgraph-api
RUN mkdir -p /api/langgraph_api /api/langgraph_runtime /api/langgraph_license && touch /api/langgraph_api/__init__.py /api/langgraph_runtime/__init__.py /api/langgraph_license/__init__.py
RUN PYTHONDONTWRITEBYTECODE=1 uv pip install --system --no-cache-dir --no-deps -e /api

# 移除构建依赖
RUN pip uninstall -y pip setuptools wheel
RUN rm -rf /usr/local/lib/python*/site-packages/pip* /usr/local/lib/python*/site-packages/setuptools* /usr/local/lib/python*/site-packages/wheel* && find /usr/local/bin -name "pip*" -delete || true
RUN rm -rf /usr/lib/python*/site-packages/pip* /usr/lib/python*/site-packages/setuptools* /usr/lib/python*/site-packages/wheel* && find /usr/bin -name "pip*" -delete || true
RUN uv pip uninstall --system pip setuptools wheel && rm /usr/bin/uv /usr/bin/uvx

WORKDIR /deps/agent-py 