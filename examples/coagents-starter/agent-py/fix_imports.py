#!/usr/bin/env python3
"""
修复 CopilotKit 中的导入错误，将旧的导入替换为新的导入
"""

import os
import re

def fix_copilotkit_imports():
    """修复 CopilotKit 中的导入错误"""
    
    # 查找 CopilotKit 的安装位置
    import copilotkit
    copilotkit_path = os.path.dirname(copilotkit.__file__)
    
    # 需要修复的文件路径
    langgraph_agent_file = os.path.join(copilotkit_path, 'langgraph_agent.py')
    
    if not os.path.exists(langgraph_agent_file):
        print(f"文件不存在: {langgraph_agent_file}")
        return
    
    # 读取原文件
    with open(langgraph_agent_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 替换错误的导入
    old_import = "from langgraph.graph.graph import CompiledGraph"
    new_import = "from langgraph.graph.state import CompiledStateGraph as CompiledGraph"
    
    if old_import in content:
        print(f"正在修复 {langgraph_agent_file}")
        content = content.replace(old_import, new_import)
        
        # 写回文件
        with open(langgraph_agent_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("修复完成！")
    else:
        print(f"在 {langgraph_agent_file} 中没有找到需要修复的导入")

if __name__ == "__main__":
    fix_copilotkit_imports() 