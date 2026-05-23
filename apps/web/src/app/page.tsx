'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  LearningStep, 
  ChatMessage, 
  ProactiveAlert, 
  GraphNode, 
  GraphEdge, 
  UserRole 
} from '@couchy/shared';
import { 
  Sparkles, 
  Send, 
  User, 
  BookOpen, 
  Activity, 
  AlertTriangle, 
  Map, 
  Network, 
  CheckCircle2, 
  ChevronRight, 
  ArrowRight,
  RefreshCw,
  Terminal,
  Cpu,
  BrainCircuit,
  Settings
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function Home() {
  // App state
  const [name, setName] = useState('Алибек');
  const [role, setRole] = useState<UserRole>('junior_backend');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Workspace/Learning path state
  const [steps, setSteps] = useState<LearningStep[]>([]);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingSources, setStreamingSources] = useState<GraphNode[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Alerts state
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  
  // Graph state
  const [graph, setGraph] = useState<{ nodes: GraphNode[], edges: GraphEdge[] }>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch alerts and graph snapshot
  const refreshAlertsAndGraph = async (sessId: string) => {
    try {
      // Fetch alerts
      const alertsRes = await fetch(`${API_URL}/alerts/${sessId}`);
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts);
      }
      
      // Fetch graph snapshot
      const graphRes = await fetch(`${API_URL}/graph/snapshot`);
      if (graphRes.ok) {
        const data = await graphRes.json();
        setGraph(data);
      }
    } catch (err) {
      console.error('Error fetching alerts/graph:', err);
    }
  };

  // Start Onboarding
  const handleStartOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/onboarding/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role })
      });

      if (!res.ok) throw new Error('Start failed');

      const data = await res.json();
      setSessionId(data.sessionId);
      setSteps(data.learningPath);
      if (data.learningPath.length > 0) {
        setActiveStep(data.learningPath[0].id);
      }

      // Load initial chat message welcome
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Привет, ${name}! Добро пожаловать в команду. Я твой AI-ассистент **Couchy**. 

Я знаю всю кодовую базу, архитектуру, ТЗ и соглашения нашей команды в реальном времени. В левой панели ты видишь свой трек онбординга. 

Задай мне любой вопрос, например:
* **"Почему в AuthService используется JWT а не сессии?"**
* **"Я собираюсь изменить UserService, на что это повлияет?"**`,
          createdAt: new Date().toISOString()
        }
      ]);

      await refreshAlertsAndGraph(data.sessionId);
    } catch (err) {
      alert('Ошибка подключения к бэкенду. Убедитесь, что NestJS API работает на порту 3001');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle step completion
  const handleToggleStep = async (stepId: string, currentStatus: boolean) => {
    if (!sessionId) return;
    try {
      const res = await fetch(`${API_URL}/onboarding/${sessionId}/step/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentStatus })
      });

      if (res.ok) {
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, completed: !currentStatus } : s));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send Chat message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !sessionId || isStreaming) return;

    const userText = inputMessage;
    setInputMessage('');
    
    // Add user message to local chat
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    
    setIsStreaming(true);
    setStreamingContent('');
    setStreamingSources([]);

    try {
      const response = await fetch(`${API_URL}/chat/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userText })
      });

      if (!response.body) throw new Error('No stream body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          // Save the last line as it might be incomplete
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                if (parsed.type === 'token') {
                  setStreamingContent(prev => prev + parsed.content);
                } else if (parsed.type === 'sources') {
                  setStreamingSources(parsed.nodes);
                } else if (parsed.type === 'alerts') {
                  // Prepend new alerts
                  setAlerts(prev => [...parsed.alerts, ...prev]);
                } else if (parsed.type === 'done') {
                  // End stream
                  done = true;
                }
              } catch (e) {
                // Incomplete JSON or noise, ignore
              }
            }
          }
        }
      }

      // Finish streaming and consolidate message into history
      setMessages(prev => [
        ...prev,
        {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: streamingContent || 'Успешно обработано.',
          sources: streamingSources,
          createdAt: new Date().toISOString()
        }
      ]);
      setStreamingContent('');
      setStreamingSources([]);

      // Refresh alerts and graph database in background
      await refreshAlertsAndGraph(sessionId);
    } catch (err) {
      console.error('Streaming error:', err);
    } finally {
      setIsStreaming(false);
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Pre-fill demo questions
  const askDemoQuestion = (question: string) => {
    if (isStreaming) return;
    setInputMessage(question);
  };

  // Node position map in our beautiful interactive SVG
  const nodePositions: Record<string, { x: number, y: number, color: string }> = {
    'AuthService': { x: 180, y: 150, color: '#8b5cf6' }, // violet
    'UserService': { x: 320, y: 220, color: '#10b981' }, // emerald
    'ТЗ-047': { x: 100, y: 250, color: '#3b82f6' }, // blue
    'JWT_Decision': { x: 220, y: 60, color: '#f59e0b' }, // amber
    'OAuth_Flow': { x: 340, y: 90, color: '#ec4899' }, // pink
    'gap_auth_session': { x: 70, y: 110, color: '#ef4444' } // red (gap)
  };

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col font-sans select-none">
      
      {/* Decorative Glow Background Orbs */}
      <div className="glow-orb bg-purple-600 w-[500px] h-[500px] top-[-100px] left-[-100px]"></div>
      <div className="glow-orb bg-indigo-600 w-[600px] h-[600px] bottom-[-200px] right-[-200px]"></div>
      <div className="glow-orb bg-emerald-600 w-[400px] h-[400px] top-[40%] right-[10%] opacity-10"></div>

      {/* HEADER */}
      <header className="glass-panel border-b border-white/5 py-4 px-6 flex justify-between items-center z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-violet-500/20">
            <BrainCircuit className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
              <span>Couchy</span>
              <span className="text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-mono font-medium">v1.0 MVP</span>
            </span>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">AI-ASSISTANT FOR DEVELOPER ONBOARDING</p>
          </div>
        </div>

        {sessionId && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-900/60 border border-white/5 px-3 py-1.5 rounded-lg text-sm">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-slate-300 font-medium text-xs">Алибек</span>
              <span className="text-slate-500 text-xs">|</span>
              <span className="text-slate-400 text-xs font-mono">Junior Backend</span>
            </div>
            
            <button 
              onClick={() => refreshAlertsAndGraph(sessionId)} 
              className="p-2 rounded-lg bg-slate-900/50 hover:bg-slate-800 border border-white/5 hover:border-white/10 transition duration-150 text-slate-400 hover:text-white"
              title="Refresh Graph & Alerts"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}
      </header>

      {/* ROOT ROUTER (ONBOARDING FORM / DASHBOARD) */}
      {!sessionId ? (
        // ONBOARDING SIGN IN PANEL
        <div className="flex-1 flex items-center justify-center p-6 z-10">
          <div className="w-full max-w-md glass-panel glass-panel-glow p-8 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Cpu className="h-40 w-40 text-violet-500" />
            </div>

            <div className="text-center mb-8">
              <span className="bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-300 text-xs border border-violet-500/30 px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
                Build with AI EdTech 2026
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight text-white mt-4 text-gradient">Быстрый Onboarding</h1>
              <p className="text-sm text-slate-400 mt-2">
                Сократите ввод нового разработчика в проект с 2 недель до 3 дней через интерактивного AI-ассистента.
              </p>
            </div>

            <form onSubmit={handleStartOnboarding} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Как вас зовут?
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Алибек"
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none text-white transition text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Ваша роль
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['junior_backend', 'junior_frontend', 'qa'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2 px-1 text-xs font-medium rounded-lg border transition duration-150 capitalize text-center ${
                        role === r
                          ? 'bg-violet-600/25 border-violet-500 text-violet-300'
                          : 'bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                      }`}
                    >
                      {r.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-violet-600/20 hover:shadow-violet-600/30 transition duration-150 text-sm flex justify-center items-center space-x-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Сборка окружения...</span>
                  </>
                ) : (
                  <>
                    <span>Начать онбординг</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        // DASHBOARD WORKSPACE
        <div className="flex-1 flex overflow-hidden z-10">
          
          {/* LEFT SIDEBAR: LEARNING PATH */}
          <aside className="w-80 glass-panel border-r border-white/5 flex flex-col overflow-y-auto">
            <div className="p-4 border-b border-white/5 flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Трек обучения</span>
            </div>

            <div className="p-4 flex-1 space-y-3">
              {steps.map((step) => (
                <div 
                  key={step.id} 
                  onClick={() => setActiveStep(step.id)}
                  className={`p-3.5 rounded-xl border transition duration-150 cursor-pointer ${
                    activeStep === step.id 
                      ? 'bg-slate-900/60 border-violet-500/50 shadow-md shadow-violet-500/5' 
                      : 'bg-slate-950/20 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between space-x-2">
                    <h3 className={`text-xs font-semibold leading-tight ${step.completed ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                      {step.title}
                    </h3>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStep(step.id, step.completed);
                      }}
                      className="text-slate-400 hover:text-white transition"
                    >
                      <CheckCircle2 className={`h-4 w-4 ${step.completed ? 'text-emerald-500 fill-emerald-500/10' : 'text-slate-600 hover:text-slate-400'}`} />
                    </button>
                  </div>
                  
                  <p className="text-[11px] text-slate-400 leading-snug mt-1.5">
                    {step.description}
                  </p>

                  {step.relatedNodes && step.relatedNodes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {step.relatedNodes.map(node => (
                        <span 
                          key={node} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNode(node);
                          }}
                          className="text-[9px] bg-slate-900 border border-white/5 text-slate-400 px-1.5 py-0.5 rounded hover:border-violet-500/50 hover:text-violet-300 transition"
                        >
                          {node}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* QUICK ACTIONS DEMO BOX */}
            <div className="p-4 border-t border-white/5 bg-slate-950/40">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Демо-сценарий (Алибек)</span>
              <div className="space-y-1.5">
                <button 
                  onClick={() => askDemoQuestion("Почему в AuthService используется JWT а не сессии?")}
                  className="w-full text-left text-[11px] bg-violet-950/20 hover:bg-violet-950/40 border border-violet-500/20 text-violet-300 p-2 rounded-lg transition"
                >
                  💬 1. Спросить про JWT сессии
                </button>
                <button 
                  onClick={() => askDemoQuestion("Я изменил UserService")}
                  className="w-full text-left text-[11px] bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 p-2 rounded-lg transition"
                >
                  💻 2. Написать: "Я изменил UserService"
                </button>
              </div>
            </div>
          </aside>

          {/* CENTRAL CHAT CONTAINER */}
          <main className="flex-1 flex flex-col overflow-hidden bg-slate-950/20">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-2xl rounded-2xl p-4 leading-relaxed text-sm ${
                    msg.role === 'user'
                      ? 'bg-violet-600/90 text-white rounded-br-none shadow-lg shadow-violet-600/10'
                      : 'glass-panel text-slate-100 rounded-bl-none'
                  }`}>
                    {/* Role Header */}
                    <div className="flex items-center space-x-2 mb-2 text-xs font-semibold text-slate-400">
                      {msg.role === 'user' ? (
                        <>
                          <User className="h-3 w-3" />
                          <span>Вы</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 text-violet-400" />
                          <span className="text-violet-400">Couchy AI Агент</span>
                        </>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="whitespace-pre-line text-slate-200">
                      {msg.content}
                    </div>

                    {/* Chat Message Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/5">
                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center space-x-1.5">
                          <Network className="h-3 w-3 text-violet-400" />
                          <span>Связи с графом (Источники):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map(src => (
                            <span 
                              key={src.id}
                              onClick={() => setSelectedNode(src.id)}
                              className="text-[10px] bg-slate-900/80 hover:bg-slate-900 border border-white/10 hover:border-violet-500/50 text-slate-300 px-2 py-0.5 rounded-md cursor-pointer transition flex items-center space-x-1"
                            >
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: nodePositions[src.id]?.color || '#a78bfa' }}></span>
                              <span>{src.label}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming Content */}
              {isStreaming && streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-2xl rounded-2xl p-4 leading-relaxed text-sm glass-panel text-slate-100 rounded-bl-none">
                    <div className="flex items-center space-x-2 mb-2 text-xs font-semibold text-violet-400">
                      <Sparkles className="h-3 w-3 animate-pulse" />
                      <span>Couchy AI Агент генерирует...</span>
                    </div>
                    <div className="whitespace-pre-line text-slate-200">
                      {streamingContent}
                      <span className="inline-block w-1.5 h-3.5 bg-violet-400 ml-0.5 animate-pulse"></span>
                    </div>

                    {/* Live streaming sources */}
                    {streamingSources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/5">
                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                          Связанные источники:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {streamingSources.map(src => (
                            <span 
                              key={src.id}
                              className="text-[10px] bg-slate-900 border border-white/5 text-slate-300 px-2 py-0.5 rounded-md flex items-center space-x-1"
                            >
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: nodePositions[src.id]?.color || '#a78bfa' }}></span>
                              <span>{src.label}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Inputs */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 glass-panel">
              <div className="relative flex items-center">
                <input
                  type="text"
                  disabled={isStreaming}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Задать вопрос ассистенту по кодовой базе (например про JWT)..."
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-3.5 pl-4 pr-12 focus:border-violet-500 outline-none text-sm transition"
                />
                <button
                  type="submit"
                  disabled={isStreaming || !inputMessage.trim()}
                  className="absolute right-2 p-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg transition disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </main>

          {/* RIGHT SIDEBAR: GRAPH VISUALIZATION & PROACTIVE ALERTS */}
          <aside className="w-80 glass-panel border-l border-white/5 flex flex-col overflow-y-auto">
            
            {/* KNOWLEDGE GRAPH INTERACTIVE PREVIEW */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Network className="h-4 w-4 text-violet-400" />
                  <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Граф знаний (P2)</span>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider animate-pulse">Live</span>
              </div>

              {/* SVG GRAPH NETWORK */}
              <div className="h-60 bg-slate-950/60 rounded-xl border border-white/5 relative overflow-hidden flex items-center justify-center">
                {graph.nodes.length === 0 ? (
                  <div className="text-slate-500 text-xs flex flex-col items-center space-y-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Загрузка графа...</span>
                  </div>
                ) : (
                  <svg className="w-full h-full" viewBox="0 0 400 300">
                    <defs>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Draw Edges */}
                    {graph.edges.map((edge, idx) => {
                      const from = nodePositions[edge.source];
                      const to = nodePositions[edge.target];
                      if (!from || !to) return null;
                      return (
                        <g key={idx}>
                          <line
                            x1={from.x}
                            y1={from.y}
                            x2={to.x}
                            y2={to.y}
                            stroke="rgba(255, 255, 255, 0.08)"
                            strokeWidth={edge.weight ? Math.min(2 + edge.weight, 5) : 1.5}
                          />
                          {/* Optionally draw text or dot on the line */}
                        </g>
                      );
                    })}

                    {/* Draw Nodes */}
                    {graph.nodes.map((node) => {
                      const pos = nodePositions[node.id];
                      if (!pos) return null;
                      const isSel = selectedNode === node.id;
                      return (
                        <g 
                          key={node.id} 
                          className="cursor-pointer"
                          onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
                        >
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r={node.type === 'gap' ? 12 : isSel ? 10 : 8}
                            fill={pos.color}
                            filter={isSel ? "url(#glow)" : undefined}
                            className="transition-all duration-300"
                          />
                          <text
                            x={pos.x}
                            y={pos.y - 12}
                            textAnchor="middle"
                            fill={isSel ? '#ffffff' : '#94a3b8'}
                            fontSize="9"
                            fontWeight={isSel ? 'bold' : 'normal'}
                            className="pointer-events-none select-none transition-colors"
                          >
                            {node.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* Node Metadata Detail overlay */}
                {selectedNode && (
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 border border-violet-500/30 rounded-lg p-2 text-[10px] leading-relaxed backdrop-blur-md">
                    <p className="font-semibold text-white flex items-center justify-between">
                      <span>Нода: {selectedNode}</span>
                      <span className="text-slate-500">type: {graph.nodes.find(n => n.id === selectedNode)?.type}</span>
                    </p>
                    <p className="text-slate-400 mt-1">
                      {selectedNode === 'AuthService' && 'Микросервис аутентификации. Главный контроллер сессий и выдачи JWT токенов.'}
                      {selectedNode === 'UserService' && 'Сервис пользователей. Выполняет CRUD, валидирует JWT токены локально.'}
                      {selectedNode === 'ТЗ-047' && 'Раздел ТЗ 3.2: Аутентификация. Требование stateless-работы.'}
                      {selectedNode === 'JWT_Decision' && 'Архитектурное решение об использовании JWT вместо сессионной авторизации.'}
                      {selectedNode === 'OAuth_Flow' && 'План по интеграции внешних OAuth2 провайдеров в будущем.'}
                      {selectedNode === 'gap_auth_session' && 'Авто-обнаруженный пробел в обучении. Юниоры часто спрашивают про сессии.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* REAL-TIME PROACTIVE ALERTS (AGENTIC LOGIC) */}
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-center space-x-2 mb-3">
                <Activity className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Proactive Alerts ({alerts.length})</span>
              </div>

              {alerts.length === 0 ? (
                <div className="flex-1 border border-dashed border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center text-slate-500">
                  <AlertTriangle className="h-5 w-5 mb-1.5 opacity-40 text-slate-500" />
                  <span className="text-xs">Оповещения отсутствуют</span>
                  <p className="text-[10px] text-slate-600 mt-1">Измените UserService или повторите вопросы для триггера</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className={`p-3 rounded-xl border leading-relaxed transition duration-150 ${
                        alert.type === 'gap_detected'
                          ? 'bg-rose-500/10 border-rose-500/30'
                          : 'bg-amber-500/10 border-amber-500/30'
                      }`}
                    >
                      <h4 className={`text-xs font-bold ${alert.type === 'gap_detected' ? 'text-rose-400' : 'text-amber-400'}`}>
                        {alert.title}
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-1">
                        {alert.body}
                      </p>
                      
                      {alert.relatedNodes && alert.relatedNodes.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {alert.relatedNodes.map(node => (
                            <span 
                              key={node} 
                              onClick={() => setSelectedNode(node)}
                              className="text-[9px] bg-black/40 border border-white/5 text-slate-400 px-1.5 py-0.5 rounded cursor-pointer hover:border-violet-500/30"
                            >
                              {node}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </aside>

        </div>
      )}
    </div>
  );
}
