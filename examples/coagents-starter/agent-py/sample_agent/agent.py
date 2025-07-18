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
from langchain_anthropic import ChatAnthropic

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

@tool
def get_weather(location: str):
    """
    Get the weather for a given location.
    """
    logger.info(f"Getting weather for {location}")
    return f"The weather for {location} is 70 degrees."

tools = [get_weather]

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
    
    logger.info("Starting chat_node execution")
    
    # 1. Define the model
    model = ChatAnthropic(model="claude-3-5-sonnet-20240620",
                                   api_key=os.getenv("ANTHROPIC_API_KEY"))

    # 2. Bind the tools to the model
    available_tools = [*state["copilotkit"]["actions"], get_weather]
    
    model_with_tools = model.bind_tools(
        available_tools,
        # Disable parallel tool calls to avoid race conditions,
        # enable this for faster performance if you want to manage
        # the complexity of running tool calls in parallel.
        parallel_tool_calls=False,
    )

    # 3. Define the system message by which the chat model will be run
    system_message = SystemMessage(
        content=f"You are a helpful assistant. Talk in {state.get('language', 'chinese')}."
    )

    # 4. Run the model to generate a response
    try:
        response = await model_with_tools.ainvoke([
            system_message,
            *state["messages"],
        ], config)
        logger.info("Model response received successfully")
    except Exception as e:
        logger.error(f"Model call failed: {str(e)}")
        raise

    # 5. Check for tool calls in the response and handle them. We ignore
    #    CopilotKit actions, as they are handled by CopilotKit.
    if isinstance(response, AIMessage) and response.tool_calls:
        logger.info(f"Found {len(response.tool_calls)} tool calls")
        
        actions = state["copilotkit"]["actions"]

        # 5.1 Check for any non-copilotkit actions in the response and
        #     if there are none, go to the tool node.
        if not any(
            action.get("name") == response.tool_calls[0].get("name")
            for action in actions
        ):
            logger.info("Going to tool_node for non-CopilotKit tool calls")
            return Command(goto="tool_node", update={"messages": response})
        else:
            logger.info("Tool calls are CopilotKit actions, letting CopilotKit handle them")

    # 6. We've handled all tool calls, so we can end the graph.
    logger.info("Finishing chat_node - going to END")
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

# For CopilotKit and other contexts, use MemorySaver
logger.info("Using CopilotKit mode - with MemorySaver checkpointer")
from langgraph.checkpoint.memory import MemorySaver
memory = MemorySaver()
graph = workflow.compile(checkpointer=memory)

logger.info("Agent graph compiled successfully")
