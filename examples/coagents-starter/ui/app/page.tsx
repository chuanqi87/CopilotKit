"use client";

import { useCoAgent, useCopilotAction } from "@copilotkit/react-core";
import { CopilotKitCSSProperties, CopilotSidebar, CopilotChat } from "@copilotkit/react-ui";
import { useState } from "react";

export default function CopilotKitPage() {
  const [themeColor, setThemeColor] = useState("#6366f1");

  // 🪁 Frontend Actions: https://docs.copilotkit.ai/guides/frontend-actions
  useCopilotAction({
    name: "setThemeColor",
    parameters: [{
      name: "themeColor",
      description: "The theme color to set. Make sure to pick nice colors.",
      required: true, 
    }],
    handler({ themeColor }) {
      setThemeColor(themeColor);
    },
  });

  return (
    <main style={{ "--copilot-kit-primary-color": themeColor } as CopilotKitCSSProperties}>
      <CopilotChat
        labels={{
          title: "Chat Assistant",
          initial: "👋 Hi, there! You're chatting with an agent. This agent comes with a few tools to get you started.\n\nFor example you can try:\n- **Frontend Tools**: \"Set the theme to orange\"\n- **Shared State**: \"Write a proverb about AI\"\n- **Generative UI**: \"Get the weather in SF\"\n\n**✨ 新增卡片功能：**\n- **用户资料卡片**: \"Show user profile for John Doe, Software Engineer\"\n- **产品卡片**: \"Show product iPhone 15, price $999, category Electronics\"\n- **任务卡片**: \"Create task Complete project, high priority, due tomorrow\"\n- **统计卡片**: \"Show stats Revenue $50,000, +15% vs last month\"\n- **选项卡片**: \"Show options for favorite programming language: JavaScript,Python,TypeScript,Go\"\n\nAs you interact with the agent, you'll see the UI update in real-time to reflect the agent's **state**, **tool calls**, and **progress**."
        }}
      />
      <YourMainContent themeColor={themeColor} />
      {/* <CopilotSidebar
        clickOutsideToClose={false}
        defaultOpen={true}
        labels={{
          title: "Popup Assistant",
          initial: "👋 Hi, there! You're chatting with an agent. This agent comes with a few tools to get you started.\n\nFor example you can try:\n- **Frontend Tools**: \"Set the theme to orange\"\n- **Shared State**: \"Write a proverb about AI\"\n- **Generative UI**: \"Get the weather in SF\"\n\n**✨ 新增卡片功能：**\n- **用户资料卡片**: \"Show user profile for John Doe, Software Engineer\"\n- **产品卡片**: \"Show product iPhone 15, price $999, category Electronics\"\n- **任务卡片**: \"Create task Complete project, high priority, due tomorrow\"\n- **统计卡片**: \"Show stats Revenue $50,000, +15% vs last month\"\n- **选项卡片**: \"Show options for favorite programming language: JavaScript,Python,TypeScript,Go\"\n\nAs you interact with the agent, you'll see the UI update in real-time to reflect the agent's **state**, **tool calls**, and **progress**."
        }}
      /> */}
    </main>
  );
}

// State of the agent, make sure this aligns with your agent's state.
type AgentState = {
  proverbs: string[];
}

function YourMainContent({ themeColor }: { themeColor: string }) {
  // 🪁 Shared State: https://docs.copilotkit.ai/coagents/shared-state
  const {state, setState} = useCoAgent<AgentState>({
    name: "sample_agent",
    initialState: {
      proverbs: [
        "CopilotKit may be new, but its the best thing since sliced bread.",
      ],
    },
  })

  // 🪁 Frontend Actions: https://docs.copilotkit.ai/coagents/frontend-actions
  useCopilotAction({
    name: "addProverb",
    parameters: [{
      name: "proverb",
      description: "The proverb to add. Make it witty, short and concise.",
      required: true,
    }],
    handler: ({ proverb }) => {
      setState({
        ...state,
        proverbs: [...state.proverbs, proverb],
      });
    },
  });

  //🪁 Generative UI: https://docs.copilotkit.ai/coagents/generative-ui
  useCopilotAction({
    name: "getWeather",
    description: "Get the weather for a given location.",
    available: "disabled",
    parameters: [
      { name: "location", type: "string", required: true },
    ],
    render: ({ args }) => {
      return <WeatherCard location={args.location} themeColor={themeColor} />
    },
  });

  // 用户资料卡片
  useCopilotAction({
    name: "showUserProfile",
    description: "Display a user profile card with user information.",
    available: "enabled",
    parameters: [
      { name: "name", type: "string", required: true, description: "User's full name" },
      { name: "role", type: "string", required: true, description: "User's role or title" },
      { name: "email", type: "string", required: true, description: "User's email address" },
      { name: "avatar", type: "string", required: false, description: "User's avatar emoji" },
    ],
    render: ({ args }) => {
      return <UserProfileCard 
        name={args.name || "未知用户"} 
        role={args.role || "未知角色"} 
        email={args.email || "unknown@example.com"} 
        avatar={args.avatar} 
        themeColor={themeColor} 
      />
    },
  });

  // 产品卡片
  useCopilotAction({
    name: "showProduct",
    description: "Display a product card with product details.",
    available: "enabled",
    parameters: [
      { name: "name", type: "string", required: true, description: "Product name" },
      { name: "price", type: "string", required: true, description: "Product price" },
      { name: "description", type: "string", required: true, description: "Product description" },
      { name: "category", type: "string", required: true, description: "Product category" },
    ],
    render: ({ args }) => {
      return <ProductCard 
        name={args.name || "未知产品"} 
        price={args.price || "¥0"} 
        description={args.description || "暂无描述"} 
        category={args.category || "其他"} 
        themeColor={themeColor} 
      />
    },
  });

  // 任务卡片
  useCopilotAction({
    name: "createTask",
    description: "Create and display a task card.",
    available: "enabled",
    parameters: [
      { name: "title", type: "string", required: true, description: "Task title" },
      { name: "priority", type: "string", required: true, description: "Task priority (high, medium, low)" },
      { name: "dueDate", type: "string", required: true, description: "Task due date" },
      { name: "status", type: "string", required: true, description: "Task status (pending, in-progress, completed)" },
    ],
    render: ({ args }) => {
      return <TaskCard 
        title={args.title || "未知任务"} 
        priority={args.priority || "medium"} 
        dueDate={args.dueDate || "待定"} 
        status={args.status || "pending"} 
        themeColor={themeColor} 
      />
    },
  });

  // 统计卡片
  useCopilotAction({
    name: "showStats",
    description: "Display statistics or metrics in a card format.",
    available: "enabled",
    parameters: [
      { name: "title", type: "string", required: true, description: "Statistics title" },
      { name: "value", type: "string", required: true, description: "Main statistic value" },
      { name: "change", type: "string", required: true, description: "Change percentage (e.g., +15%)" },
      { name: "period", type: "string", required: true, description: "Time period (e.g., vs last month)" },
    ],
    render: ({ args }) => {
      return <StatsCard 
        title={args.title || "统计数据"} 
        value={args.value || "0"} 
        change={args.change || "0%"} 
        period={args.period || "本月"} 
        themeColor={themeColor} 
      />
    },
  });

  // 选项卡片
  useCopilotAction({
    name: "showOptions",
    description: "Display an options card with multiple choices for user selection.",
    available: "enabled",
    parameters: [
      { name: "title", type: "string", required: true, description: "Options card title" },
      { name: "question", type: "string", required: true, description: "The question or prompt" },
      { name: "options", type: "string", required: true, description: "Comma-separated options (e.g., 'Option A,Option B,Option C')" },
      { name: "type", type: "string", required: false, description: "Type of selection: 'single' or 'multiple'" },
    ],
    render: ({ args }) => {
      const optionsArray = args.options ? args.options.split(',').map(opt => opt.trim()) : [];
      return <OptionsCard 
        title={args.title || "选择选项"} 
        question={args.question || "请选择一个选项"} 
        options={optionsArray} 
        type={args.type || "single"} 
        themeColor={themeColor} 
      />
    },
  });

  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="h-screen w-screen flex justify-center items-center flex-col transition-colors duration-300"
    >
      <div className="bg-white/20 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-white mb-2 text-center">Proverbs</h1>
        <p className="text-gray-200 text-center italic mb-6">This is a demonstrative page, but it could be anything you want! 🪁</p>
        <hr className="border-white/20 my-6" />
        <div className="flex flex-col gap-3">
          {state.proverbs?.map((proverb, index) => (
            <div 
              key={index} 
              className="bg-white/15 p-4 rounded-xl text-white relative group hover:bg-white/20 transition-all"
            >
              <p className="pr-8">{proverb}</p>
              <button 
                onClick={() => setState({
                  ...state,
                  proverbs: state.proverbs?.filter((_, i) => i !== index),
                })}
                className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity 
                  bg-red-500 hover:bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {state.proverbs?.length === 0 && <p className="text-center text-white/80 italic my-8">
          No proverbs yet. Ask the assistant to add some!
        </p>}
      </div>
    </div>
  );
}

// Simple sun icon for the weather card
function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-14 h-14 text-yellow-200">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeWidth="2" stroke="currentColor" />
    </svg>
  );
}

// Weather card component where the location and themeColor are based on what the agent
// sets via tool calls.
function WeatherCard({ location, themeColor }: { location?: string, themeColor: string }) {
  return (
    <div
    style={{ backgroundColor: themeColor }}
    className="rounded-xl shadow-xl mt-6 mb-4 max-w-md w-full"
  >
    <div className="bg-white/20 p-4 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white capitalize">{location}</h3>
          <p className="text-white">Current Weather</p>
        </div>
        <SunIcon />
      </div>
      
      <div className="mt-4 flex items-end justify-between">
        <div className="text-3xl font-bold text-white">70°</div>
        <div className="text-sm text-white">Clear skies</div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-white">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-white text-xs">Humidity</p>
            <p className="text-white font-medium">45%</p>
          </div>
          <div>
            <p className="text-white text-xs">Wind</p>
            <p className="text-white font-medium">5 mph</p>
          </div>
          <div>
            <p className="text-white text-xs">Feels Like</p>
            <p className="text-white font-medium">72°</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}

// 用户资料卡片组件
function UserProfileCard({ 
  name, 
  role, 
  email, 
  avatar = "👤", 
  themeColor 
}: { 
  name: string; 
  role: string; 
  email: string; 
  avatar?: string; 
  themeColor: string 
}) {
  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="rounded-xl shadow-xl mt-6 mb-4 max-w-md w-full"
    >
      <div className="bg-white/20 p-6 w-full">
        <div className="flex items-center space-x-4">
          <div className="text-5xl">{avatar}</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white">{name}</h3>
            <p className="text-white/80 text-sm">{role}</p>
            <p className="text-white/60 text-xs mt-1">{email}</p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="flex justify-between items-center">
            <span className="text-white/80 text-sm">状态</span>
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">在线</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 产品卡片组件
function ProductCard({ 
  name, 
  price, 
  description, 
  category, 
  themeColor 
}: { 
  name: string; 
  price: string; 
  description: string; 
  category: string; 
  themeColor: string 
}) {
  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="rounded-xl shadow-xl mt-6 mb-4 max-w-md w-full"
    >
      <div className="bg-white/20 p-6 w-full">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">{category}</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
            <p className="text-white/80 text-sm mb-4">{description}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-white/20">
          <span className="text-2xl font-bold text-white">{price}</span>
          <button className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-white/90 transition-colors">
            购买
          </button>
        </div>
      </div>
    </div>
  );
}

// 任务卡片组件
function TaskCard({ 
  title, 
  priority, 
  dueDate, 
  status, 
  themeColor 
}: { 
  title: string; 
  priority: string; 
  dueDate: string; 
  status: string; 
  themeColor: string 
}) {
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return '✅';
      case 'in-progress': return '⏳';
      case 'pending': return '📋';
      default: return '📋';
    }
  };

  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="rounded-xl shadow-xl mt-6 mb-4 max-w-md w-full"
    >
      <div className="bg-white/20 p-6 w-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getStatusIcon(status)}</span>
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
          <span className={`${getPriorityColor(priority)} text-white text-xs px-2 py-1 rounded-full`}>
            {priority}
          </span>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm">状态</span>
            <span className="text-white text-sm capitalize">{status}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm">截止日期</span>
            <span className="text-white text-sm">{dueDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 统计卡片组件
function StatsCard({ 
  title, 
  value, 
  change, 
  period, 
  themeColor 
}: { 
  title: string; 
  value: string; 
  change: string; 
  period: string; 
  themeColor: string 
}) {
  const isPositive = change.includes('+');
  
  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="rounded-xl shadow-xl mt-6 mb-4 max-w-md w-full"
    >
      <div className="bg-white/20 p-6 w-full">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white/80 mb-2">{title}</h3>
          <div className="text-3xl font-bold text-white">{value}</div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-white/20">
          <span className="text-white/60 text-sm">{period}</span>
          <span className={`text-sm font-medium ${isPositive ? 'text-green-200' : 'text-red-200'}`}>
            {change}
          </span>
        </div>
      </div>
    </div>
  );
}

// 选项卡片组件
function OptionsCard({ 
  title, 
  question, 
  options, 
  type = "single", 
  themeColor 
}: { 
  title: string; 
  question: string; 
  options: string[]; 
  type?: string; 
  themeColor: string 
}) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleOptionSelect = (option: string) => {
    if (type === "single") {
      setSelectedOptions([option]);
    } else {
      setSelectedOptions(prev => 
        prev.includes(option) 
          ? prev.filter(opt => opt !== option)
          : [...prev, option]
      );
    }
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    // 这里可以添加提交逻辑
    console.log('Selected options:', selectedOptions);
  };

  const handleReset = () => {
    setSelectedOptions([]);
    setIsSubmitted(false);
  };

  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="rounded-xl shadow-xl mt-6 mb-4 max-w-md w-full"
    >
      <div className="bg-white/20 p-6 w-full">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-white/80 text-sm mb-4">{question}</p>
        </div>
        
        <div className="space-y-3 mb-4">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => !isSubmitted && handleOptionSelect(option)}
              disabled={isSubmitted}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${
                selectedOptions.includes(option)
                  ? 'border-white bg-white/20 text-white'
                  : 'border-white/30 bg-white/5 text-white/80 hover:border-white/50 hover:bg-white/10'
              } ${isSubmitted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedOptions.includes(option) ? 'border-white bg-white' : 'border-white/50'
                }`}>
                  {selectedOptions.includes(option) && (
                    <div className="w-2 h-2 rounded-full bg-black"></div>
                  )}
                </div>
                <span className="text-sm">{option}</span>
              </div>
            </button>
          ))}
        </div>

        {type === "multiple" && (
          <div className="text-xs text-white/60 mb-4">
            💡 提示：可以选择多个选项
          </div>
        )}
        
        <div className="flex gap-2 pt-4 border-t border-white/20">
          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              disabled={selectedOptions.length === 0}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                selectedOptions.length > 0
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-white/30 text-white/50 cursor-not-allowed'
              }`}
            >
              提交选择
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-between">
              <div className="text-white/80 text-sm">
                ✅ 已选择: {selectedOptions.join(', ')}
              </div>
              <button
                onClick={handleReset}
                className="bg-white/20 text-white px-3 py-1 rounded-lg text-sm hover:bg-white/30 transition-colors"
              >
                重新选择
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
