"""
This is the main entry point for the agent.
It defines the workflow graph, state, tools, nodes and edges.
"""

import os
import logging
from typing_extensions import Literal
from langchain_core.messages import SystemMessage, AIMessage
from langchain_core.runnables import RunnableConfig
from langchain.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.types import Command
from langgraph.prebuilt import ToolNode
from copilotkit import CopilotKitState

# 尝试导入Claude，如果失败则使用Gemini
try:
    from langchain_anthropic import ChatAnthropic
    ANTHROPIC_AVAILABLE = True
    print("✅ [INIT] Claude模型可用")
except ImportError:
    ANTHROPIC_AVAILABLE = False
    print("⚠️ [INIT] Claude模型不可用，使用Gemini模型")

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AgentState(CopilotKitState):
    """
    Here we define the state of the agent

    In this instance, we're inheriting from CopilotKitState, which will bring in
    the CopilotKitState fields. We're also adding a custom field, `language`,
    which will be used to set the language of the agent.
    """
    proverbs: list[str] = []
    # your_custom_agent_state: str = ""

@tool
def get_weather(location: str):
    """
    Get the weather for a given location.
    """
    logger.info(f"🌤️ [TOOL] get_weather called with location: {location}")
    result = f"The weather for {location} is 70 degrees."
    logger.info(f"🌤️ [TOOL] get_weather returning: {result}")
    return result

# @tool
# def your_tool_here(your_arg: str):
#     """Your tool description here."""
#     print(f"Your tool logic here")
#     return "Your tool response here."

tools = [
    get_weather
    # your_tool_here
]

async def chat_node(state: AgentState, config: RunnableConfig) -> Command[Literal["tool_node", "__end__"]]:
    """
    Standard chat node based on the ReAct design pattern. It handles:
    - The model to use (and binds in CopilotKit actions and the tools defined above)
    - The system prompt
    - Getting a response from the model
    - Handling tool calls

    For more about the ReAct design pattern, see:
    https://www.perplexity.ai/search/react-agents-NcXLQhreS0WDzpVaS4m9Cg
    """
    
    print("🚀 [CHAT_NODE] Starting chat_node execution")
    print(f"📨 [CHAT_NODE] Received {len(state['messages'])} messages")
    print(f"🔧 [CHAT_NODE] CopilotKit actions: {len(state['copilotkit']['actions'])} available")
    
    logger.info("🚀 [CHAT_NODE] Starting chat_node execution")
    logger.info(f"📨 [CHAT_NODE] Received {len(state['messages'])} messages")
    logger.info(f"🔧 [CHAT_NODE] CopilotKit actions: {len(state['copilotkit']['actions'])} available")
    
    # Log the latest user message for debugging
    if state["messages"]:
        latest_msg = state["messages"][-1]
        print(f"💬 [CHAT_NODE] Latest message: {latest_msg.content[:100]}...")
        logger.info(f"💬 [CHAT_NODE] Latest message: {latest_msg.content[:100]}...")

    # 1. Define the model
    if ANTHROPIC_AVAILABLE and os.getenv("ANTHROPIC_API_KEY"):
        print("🤖 [CHAT_NODE] Initializing Claude 3.5 Sonnet model")
        logger.info("🤖 [CHAT_NODE] Initializing Claude 3.5 Sonnet model")
        model = ChatAnthropic(
            model="claude-3-5-sonnet-20241022",
            temperature=0.7,
            max_tokens=1024
        )
        model_name = "Claude 3.5 Sonnet"
    else:
        print("🤖 [CHAT_NODE] Initializing Gemini 2.5 Pro model")
        logger.info("🤖 [CHAT_NODE] Initializing Gemini 2.5 Pro model")
        model = ChatGoogleGenerativeAI(model="gemini-2.5-pro")
        model_name = "Gemini 2.5 Pro"

    # 2. Bind the tools to the model
    logger.info("🔧 [CHAT_NODE] Binding tools to model")
    available_tools = [*state["copilotkit"]["actions"], get_weather]
    logger.info(f"🛠️ [CHAT_NODE] Available tools: {[tool.name if hasattr(tool, 'name') else str(tool) for tool in available_tools]}")
    
    model_with_tools = model.bind_tools(
        available_tools,
        # 2.1 Disable parallel tool calls to avoid race conditions,
        #     enable this for faster performance if you want to manage
        #     the complexity of running tool calls in parallel.
        parallel_tool_calls=False,
    )

    # 3. Define the system message by which the chat model will be run
    system_message = SystemMessage(
        content=f"You are a helpful assistant. Talk in {state.get('language', 'english')}."
    )
    logger.info(f"📋 [CHAT_NODE] System message: {system_message.content}")

    # 4. Run the model to generate a response
    print(f"⏳ [CHAT_NODE] Calling {model_name} model...")
    logger.info(f"⏳ [CHAT_NODE] Calling {model_name} model...")
    try:
        response = await model_with_tools.ainvoke([
            system_message,
            *state["messages"],
        ], config)
        print("✅ [CHAT_NODE] Model response received successfully")
        print(f"📤 [CHAT_NODE] Response type: {type(response)}")
        print(f"📝 [CHAT_NODE] Response content: {response.content[:200]}...")
        
        logger.info("✅ [CHAT_NODE] Model response received successfully")
        logger.info(f"📤 [CHAT_NODE] Response type: {type(response)}")
        logger.info(f"📝 [CHAT_NODE] Response content: {response.content[:200]}...")
    except Exception as e:
        print(f"❌ [CHAT_NODE] Model call failed: {str(e)}")
        logger.error(f"❌ [CHAT_NODE] Model call failed: {str(e)}")
        raise

    # 5. Check for tool calls in the response and handle them. We ignore
    #    CopilotKit actions, as they are handled by CopilotKit.
    if isinstance(response, AIMessage) and response.tool_calls:
        logger.info(f"🔧 [CHAT_NODE] Found {len(response.tool_calls)} tool calls")
        logger.info(f"📋 [CHAT_NODE] Tool calls: {[tc.get('name') for tc in response.tool_calls]}")
        
        actions = state["copilotkit"]["actions"]

        # 5.1 Check for any non-copilotkit actions in the response and
        #     if there are none, go to the tool node.
        if not any(
            action.get("name") == response.tool_calls[0].get("name")
            for action in actions
        ):
            logger.info("🔧 [CHAT_NODE] Going to tool_node for non-CopilotKit tool calls")
            return Command(goto="tool_node", update={"messages": response})
        else:
            logger.info("🔧 [CHAT_NODE] Tool calls are CopilotKit actions, letting CopilotKit handle them")

    # 6. We've handled all tool calls, so we can end the graph.
    logger.info("🏁 [CHAT_NODE] Finishing chat_node - going to END")
    return Command(
        goto=END,
        update={
            "messages": response
        }
    )

# Define the workflow graph
workflow = StateGraph(AgentState)
workflow.add_node("chat_node", chat_node)
workflow.add_node("tool_node", ToolNode(tools=tools))
workflow.add_edge("tool_node", "chat_node")
workflow.set_entry_point("chat_node")

# Conditionally use a checkpointer based on the environment
# Check for multiple indicators that we're running in LangGraph dev/API mode
is_langgraph_api = (
    os.environ.get("LANGGRAPH_API", "false").lower() == "true" or
    os.environ.get("LANGGRAPH_API_DIR") is not None
)

print(f"🔧 [INIT] LangGraph API mode: {is_langgraph_api}")
logger.info(f"🔧 [INIT] LangGraph API mode: {is_langgraph_api}")

if is_langgraph_api:
    # When running in LangGraph API/dev, don't use a custom checkpointer
    print("🔧 [INIT] Using LangGraph API mode - no checkpointer")
    logger.info("🔧 [INIT] Using LangGraph API mode - no checkpointer")
    graph = workflow.compile()
else:
    # For CopilotKit and other contexts, use MemorySaver
    print("🔧 [INIT] Using CopilotKit mode - with MemorySaver checkpointer")
    logger.info("🔧 [INIT] Using CopilotKit mode - with MemorySaver checkpointer")
    from langgraph.checkpoint.memory import MemorySaver
    memory = MemorySaver()
    graph = workflow.compile(checkpointer=memory)

print("🚀 [INIT] Agent graph compiled successfully")
logger.info("🚀 [INIT] Agent graph compiled successfully")
