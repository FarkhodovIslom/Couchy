'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GraphNode, UserRole, LearningStep } from '@kibo/shared';
import LearningPath from './LearningPath';
import MetaPanel from './MetaPanel';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import SuggestedQuestions from './SuggestedQuestions';
import { getGraphSnapshot } from '../lib/api';
import { useAlerts } from '../hooks/useAlerts';
import { useOnboarding } from '../hooks/useOnboarding';
import { useChat } from '../hooks/useChat';

interface Props {
  sessionId: string;
  steps: LearningStep[];
  userName: string;
  role: UserRole;
}

export default function ChatWorkspace({ sessionId, steps: initialSteps, userName }: Props) {
  const { steps, setSteps, markStepComplete } = useOnboarding(sessionId, initialSteps);
  const { alerts, addAlerts, markRead } = useAlerts(sessionId);

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [feedEvents, setFeedEvents] = useState<any[]>([]);
  const [chatInputValue, setChatInputValue] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileMetaOpen, setMobileMetaOpen] = useState(false);

  const handleNodesMentioned = useCallback((nodeIds: string[]) => {
    setQuestionCounts((prev) => {
      const next = { ...prev };
      for (const id of nodeIds) next[id] = (next[id] ?? 0) + 1;
      return next;
    });
    getGraphSnapshot().then((data) => setNodes(data.nodes));
  }, []);

  const { messages, isStreaming, isThinking, streamContent, streamSources, suggestions, send, stop } = useChat({
    sessionId,
    onNewAlerts: addAlerts,
    onNodesMentioned: handleNodesMentioned,
    onStepComplete: markStepComplete,
  });

  // Load initial graph snapshot
  useEffect(() => {
    getGraphSnapshot().then((data) => setNodes(data.nodes));
  }, [sessionId]);

  // Subscribe to simulation SSE
  useEffect(() => {
    const sseUrl = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/simulation/stream`;
    const es = new EventSource(sseUrl);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'reset') {
          setFeedEvents([]);
          getGraphSnapshot().then((s) => setNodes(s.nodes));
        } else {
          setFeedEvents((prev) => [data, ...prev]);
          getGraphSnapshot().then((s) => setNodes(s.nodes));
        }
      } catch {}
    };
    return () => es.close();
  }, [sessionId]);

  // Mobile resize handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) { setMobileSidebarOpen(false); setMobileMetaOpen(false); }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAskQuestion = (q: string) => {
    setChatInputValue(q);
    setMobileSidebarOpen(false);
  };

  // Injected input consumed after use
  const inputValueRef = useRef(chatInputValue);
  inputValueRef.current = chatInputValue;

  const handleSend = useCallback(async () => {
    const text = chatInputValue.trim();
    if (!text) return;
    setChatInputValue('');
    await send(text);
  }, [chatInputValue, send]);

  const handleSuggestionSelect = useCallback(async (question: string) => {
    setChatInputValue('');
    await send(question);
  }, [send]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-base)',
      }}
      className="anim-page-enter"
    >
      {/* Mobile header */}
      {isMobile && (
        <header
          style={{
            height: '48px',
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            flexShrink: 0,
            zIndex: 100,
          }}
        >
          <button
            onClick={() => { setMobileSidebarOpen(true); setMobileMetaOpen(false); }}
            style={{ background: 'none', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}
          >
            Steps ({steps.filter((s) => s.completed).length}/{steps.length})
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>
            Kibo
          </span>
          <button
            onClick={() => { setMobileMetaOpen(true); setMobileSidebarOpen(false); }}
            style={{ background: 'none', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}
          >
            Alerts ({alerts.filter((a) => !a.read).length || alerts.length})
          </button>
        </header>
      )}

      {/* Backdrop */}
      {isMobile && (mobileSidebarOpen || mobileMetaOpen) && (
        <div
          onClick={() => { setMobileSidebarOpen(false); setMobileMetaOpen(false); }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 200, animation: 'ios-in var(--dur-fast) var(--ease-ios) both' }}
        />
      )}

      {/* Left sidebar */}
      {!isMobile ? (
        <LearningPath sessionId={sessionId} steps={steps} onStepsChange={setSteps} onAskQuestion={handleAskQuestion} />
      ) : mobileSidebarOpen && (
        <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '260px', zIndex: 300, backgroundColor: 'var(--bg-surface)', boxShadow: '4px 0 24px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', animation: 'ios-slide-up var(--dur-normal) var(--ease-spring) both' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
            <button onClick={() => setMobileSidebarOpen(false)} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', cursor: 'pointer' }}>✕ CLOSE</button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <LearningPath sessionId={sessionId} steps={steps} onStepsChange={setSteps} onAskQuestion={handleAskQuestion} />
          </div>
        </div>
      )}

      {/* Chat center */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
        <ChatMessages
          messages={messages}
          isStreaming={isStreaming}
          isThinking={isThinking}
          streamContent={streamContent}
          streamSources={streamSources}
          suggestions={suggestions}
          onSuggestionSelect={handleSuggestionSelect}
        />
        <ChatInput
          value={chatInputValue}
          onChange={setChatInputValue}
          onSubmit={handleSend}
          onStop={stop}
          isStreaming={isStreaming}
        />
      </main>

      {/* Right meta panel */}
      {!isMobile ? (
        <MetaPanel alerts={alerts} nodes={nodes} questionCounts={questionCounts} feedEvents={feedEvents} onMarkRead={markRead} />
      ) : mobileMetaOpen && (
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '290px', zIndex: 300, backgroundColor: 'var(--bg-surface)', boxShadow: '-4px 0 24px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', animation: 'ios-slide-up var(--dur-normal) var(--ease-spring) both' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '12px 16px 0' }}>
            <button onClick={() => setMobileMetaOpen(false)} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', cursor: 'pointer' }}>✕ CLOSE</button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <MetaPanel alerts={alerts} nodes={nodes} questionCounts={questionCounts} feedEvents={feedEvents} onMarkRead={markRead} />
          </div>
        </div>
      )}
    </div>
  );
}

// Extracted chat message list component
interface ChatMessagesProps {
  messages: any[];
  isStreaming: boolean;
  isThinking: boolean;
  streamContent: string;
  streamSources: GraphNode[];
  suggestions: string[];
  onSuggestionSelect: (question: string) => void;
}

function ChatMessages({ messages, isStreaming, isThinking, streamContent, streamSources, suggestions, onSuggestionSelect }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent, suggestions]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {messages.length === 0 && !isStreaming && (
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '48px' }} className="anim-ios-in">
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginRight: '8px' }}>Kibo</span>
          готов. Задай первый вопрос.
        </div>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} role={msg.role} content={msg.content} sources={msg.sources} />
      ))}
      {isStreaming && (
        <MessageBubble role="assistant" content={streamContent} sources={streamSources} isStreaming isThinking={isThinking && !streamContent} />
      )}
      {!isStreaming && suggestions.length > 0 && (
        <SuggestedQuestions suggestions={suggestions} onSelect={onSuggestionSelect} />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
