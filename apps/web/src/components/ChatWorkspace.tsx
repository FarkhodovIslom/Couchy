'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LearningStep, ProactiveAlert, GraphNode, UserRole } from '@couchy/shared';
import LearningPath from './LearningPath';
import ChatPane from './ChatPane';
import MetaPanel from './MetaPanel';
import { getAlerts, getGraphSnapshot } from '../lib/api';

interface Props {
  sessionId: string;
  steps: LearningStep[];
  userName: string;
  role: UserRole;
}

export default function ChatWorkspace({ sessionId, steps: initialSteps, userName, role }: Props) {
  const [steps, setSteps]               = useState<LearningStep[]>(initialSteps);
  const [alerts, setAlerts]             = useState<ProactiveAlert[]>([]);
  const [nodes, setNodes]               = useState<GraphNode[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [pendingQuestion, setPendingQuestion] = useState<string>('');
  const chatPaneRef = useRef<{ setInput: (v: string) => void } | null>(null);

  // Load initial graph snapshot
  useEffect(() => {
    getGraphSnapshot().then(data => setNodes(data.nodes));
  }, [sessionId]);

  // Poll alerts every 10s (light background refresh)
  useEffect(() => {
    const fetchAlerts = () => getAlerts(sessionId).then(a => {
      if (a.length > 0) setAlerts(a);
    });
    const interval = setInterval(fetchAlerts, 10_000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Handle new alerts from stream
  const handleNewAlerts = useCallback((newAlerts: ProactiveAlert[]) => {
    setAlerts(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const unique = newAlerts.filter(a => !existingIds.has(a.id));
      return [...unique, ...prev];
    });
  }, []);

  // Track question counts for gap badges
  const handleNodesMentioned = useCallback((nodeIds: string[]) => {
    setQuestionCounts(prev => {
      const next = { ...prev };
      for (const id of nodeIds) {
        next[id] = (next[id] ?? 0) + 1;
      }
      return next;
    });
    // Refresh graph to pick up any new gap nodes
    getGraphSnapshot().then(data => setNodes(data.nodes));
  }, []);

  // Demo question injection — passed to ChatPane via inputValue prop pattern
  const [chatInputValue, setChatInputValue] = useState('');
  const handleAskQuestion = (q: string) => {
    setChatInputValue(q);
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      {/* Left sidebar */}
      <LearningPath
        sessionId={sessionId}
        steps={steps}
        onStepsChange={setSteps}
        onAskQuestion={handleAskQuestion}
      />

      {/* Chat pane — takes injected input value via controlled prop */}
      <ChatPaneWrapper
        sessionId={sessionId}
        userName={userName}
        onNewAlerts={handleNewAlerts}
        onNodesMentioned={handleNodesMentioned}
        injectedInput={chatInputValue}
        onInjectedInputConsumed={() => setChatInputValue('')}
      />

      {/* Right meta panel */}
      <MetaPanel
        alerts={alerts}
        nodes={nodes}
        questionCounts={questionCounts}
      />
    </div>
  );
}

// Thin wrapper to handle injected input from demo buttons
interface WrapperProps {
  sessionId: string;
  userName: string;
  onNewAlerts: (a: ProactiveAlert[]) => void;
  onNodesMentioned: (ids: string[]) => void;
  injectedInput: string;
  onInjectedInputConsumed: () => void;
}

function ChatPaneWrapper({
  sessionId,
  userName,
  onNewAlerts,
  onNodesMentioned,
  injectedInput,
  onInjectedInputConsumed,
}: WrapperProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (injectedInput) {
      setValue(injectedInput);
      onInjectedInputConsumed();
    }
  }, [injectedInput, onInjectedInputConsumed]);

  return (
    <ChatPaneControlled
      sessionId={sessionId}
      userName={userName}
      onNewAlerts={onNewAlerts}
      onNodesMentioned={onNodesMentioned}
      externalValue={value}
      onExternalValueChange={setValue}
    />
  );
}

// ChatPane variant that accepts external input value control
interface ControlledProps {
  sessionId: string;
  userName: string;
  onNewAlerts: (a: ProactiveAlert[]) => void;
  onNodesMentioned: (ids: string[]) => void;
  externalValue: string;
  onExternalValueChange: (v: string) => void;
}

import { streamMessage } from '../lib/api';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { ChatMessage } from '@couchy/shared';

function ChatPaneControlled({
  sessionId,
  onNewAlerts,
  onNodesMentioned,
  externalValue,
  onExternalValueChange,
}: ControlledProps) {
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming]     = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [streamSources, setStreamSources] = useState<GraphNode[]>([]);
  const abortRef  = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent]);

  const handleSend = useCallback(async () => {
    const text = externalValue.trim();
    if (!text || isStreaming) return;

    onExternalValueChange('');

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamContent('');
    setStreamSources([]);

    const abort = new AbortController();
    abortRef.current = abort;

    let fullContent = '';
    let finalSources: GraphNode[] = [];

    await streamMessage(
      sessionId,
      text,
      {
        onToken: t => { fullContent += t; setStreamContent(fullContent); },
        onSources: nodes => { finalSources = nodes; setStreamSources(nodes); onNodesMentioned(nodes.map(n => n.id)); },
        onAlerts: a => onNewAlerts(a),
        onDone: () => {
          setMessages(prev => [...prev, {
            id: `a_${Date.now()}`,
            role: 'assistant',
            content: fullContent || '—',
            sources: finalSources,
            createdAt: new Date().toISOString(),
          }]);
          setStreamContent('');
          setStreamSources([]);
          setIsStreaming(false);
        },
        onError: err => {
          setMessages(prev => [...prev, {
            id: `err_${Date.now()}`,
            role: 'assistant',
            content: `Ошибка: ${err.message}`,
            createdAt: new Date().toISOString(),
          }]);
          setStreamContent('');
          setIsStreaming(false);
        },
      },
      abort.signal,
    );
  }, [externalValue, isStreaming, sessionId, onNewAlerts, onNodesMentioned, onExternalValueChange]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    if (streamContent) {
      setMessages(prev => [...prev, {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: streamContent + ' [остановлено]',
        createdAt: new Date().toISOString(),
      }]);
    }
    setStreamContent('');
    setStreamSources([]);
    setIsStreaming(false);
  }, [streamContent]);

  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {messages.length === 0 && !isStreaming && (
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-tertiary)',
              textAlign: 'center',
              marginTop: '48px',
            }}
            className="anim-ios-in"
          >
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginRight: '8px' }}>
              Jarvis
            </span>
            готов. Задай первый вопрос.
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            role={msg.role as 'user' | 'assistant'}
            content={msg.content}
            sources={msg.sources as GraphNode[] | undefined}
          />
        ))}

        {isStreaming && (
          <MessageBubble
            role="assistant"
            content={streamContent}
            isStreaming
          />
        )}

        <div ref={bottomRef} />
      </div>

      <ChatInput
        value={externalValue}
        onChange={onExternalValueChange}
        onSubmit={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
      />
    </main>
  );
}
