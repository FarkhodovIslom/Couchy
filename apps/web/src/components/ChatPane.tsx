'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ChatMessage, GraphNode } from '@couchy/shared';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { streamMessage } from '../lib/api';

interface Props {
  sessionId: string;
  userName: string;
  initialMessages?: ChatMessage[];
  onNewAlerts: (alerts: any[]) => void;
  onNodesMentioned: (nodeIds: string[]) => void;
}

export default function ChatPane({
  sessionId,
  userName,
  initialMessages = [],
  onNewAlerts,
  onNodesMentioned,
}: Props) {
  const [messages, setMessages]             = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue]         = useState('');
  const [isStreaming, setIsStreaming]       = useState(false);
  const [streamContent, setStreamContent]  = useState('');
  const [streamSources, setStreamSources]  = useState<GraphNode[]>([]);

  const abortRef     = useRef<AbortController | null>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages or streaming content changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    setInputValue('');

    // Add user message immediately
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
        onToken: token => {
          fullContent += token;
          setStreamContent(fullContent);
        },
        onSources: nodes => {
          finalSources = nodes;
          setStreamSources(nodes);
          // Notify parent about mentioned nodes for question counting
          onNodesMentioned(nodes.map(n => n.id));
        },
        onAlerts: alerts => {
          onNewAlerts(alerts);
        },
        onDone: () => {
          // Commit streamed content to message history
          const assistantMsg: ChatMessage = {
            id: `a_${Date.now()}`,
            role: 'assistant',
            content: fullContent || '—',
            sources: finalSources,
            createdAt: new Date().toISOString(),
          };
          setMessages(prev => [...prev, assistantMsg]);
          setStreamContent('');
          setStreamSources([]);
          setIsStreaming(false);
        },
        onError: err => {
          const errMsg: ChatMessage = {
            id: `err_${Date.now()}`,
            role: 'assistant',
            content: `Ошибка: ${err.message}`,
            createdAt: new Date().toISOString(),
          };
          setMessages(prev => [...prev, errMsg]);
          setStreamContent('');
          setIsStreaming(false);
        },
      },
      abort.signal,
    );
  }, [inputValue, isStreaming, sessionId, onNewAlerts, onNodesMentioned]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    if (streamContent) {
      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: streamContent + ' [остановлено]',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    }
    setStreamContent('');
    setStreamSources([]);
    setIsStreaming(false);
  }, [streamContent]);

  // Allow parent to inject a question (demo buttons)
  useEffect(() => {
    // Exposed via a custom event or prop — handled via setInputValue
  }, []);

  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-base)',
      }}
      className="anim-page-enter"
    >
      {/* Messages */}
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
        {/* Welcome */}
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
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent)',
                marginRight: '8px',
              }}
            >
              Jarvis
            </span>
            готов. Задай первый вопрос.
          </div>
        )}

        {/* History */}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            role={msg.role as 'user' | 'assistant'}
            content={msg.content}
            sources={msg.sources as GraphNode[] | undefined}
          />
        ))}

        {/* Live streaming bubble */}
        {isStreaming && (
          <MessageBubble
            role="assistant"
            content={streamContent}
            isStreaming
          />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
      />
    </main>
  );
}

// Allow parent to imperatively set input value (for demo buttons)
export { };
