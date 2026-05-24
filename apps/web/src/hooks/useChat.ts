'use client';

import { useState, useCallback, useRef } from 'react';
import { ChatMessage, GraphNode, ProactiveAlert } from '@kibo/shared';
import { streamMessage } from '../lib/api';

interface UseChatOptions {
  sessionId: string;
  onNewAlerts?: (alerts: ProactiveAlert[]) => void;
  onNodesMentioned?: (nodeIds: string[]) => void;
  onStepComplete?: (stepId: string) => void;
}

export function useChat({ sessionId, onNewAlerts, onNodesMentioned, onStepComplete }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [streamSources, setStreamSources] = useState<GraphNode[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: ChatMessage = {
        id: `u_${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setIsThinking(false);
      setStreamContent('');
      setStreamSources([]);
      setSuggestions([]);

      const abort = new AbortController();
      abortRef.current = abort;

      let fullContent = '';
      let finalSources: GraphNode[] = [];

      await streamMessage(
        sessionId,
        text,
        {
          onToken: (t) => {
            setIsThinking(false);
            fullContent += t;
            setStreamContent(fullContent);
          },
          onThinking: () => {
            setIsThinking(true);
          },
          onSources: (nodes) => {
            finalSources = nodes;
            setStreamSources(nodes);
            onNodesMentioned?.(nodes.map((n) => n.id));
          },
          onAlerts: (a) => onNewAlerts?.(a),
          onSuggestions: (s) => setSuggestions(s),
          onStepComplete: (stepId) => onStepComplete?.(stepId),
          onDone: () => {
            setMessages((prev) => [
              ...prev,
              {
                id: `a_${Date.now()}`,
                role: 'assistant',
                content: fullContent || '—',
                sources: finalSources,
                createdAt: new Date().toISOString(),
              },
            ]);
            setStreamContent('');
            setStreamSources([]);
            setIsStreaming(false);
            setIsThinking(false);
          },
          onError: (err) => {
            setMessages((prev) => [
              ...prev,
              {
                id: `err_${Date.now()}`,
                role: 'assistant',
                content: `Ошибка: ${err.message}`,
                createdAt: new Date().toISOString(),
              },
            ]);
            setStreamContent('');
            setIsStreaming(false);
            setIsThinking(false);
          },
        },
        abort.signal,
      );
    },
    [isStreaming, sessionId, onNewAlerts, onNodesMentioned, onStepComplete],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    if (streamContent) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: streamContent + ' [остановлено]',
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    setStreamContent('');
    setStreamSources([]);
    setIsStreaming(false);
    setIsThinking(false);
  }, [streamContent]);

  return {
    messages,
    isStreaming,
    isThinking,
    streamContent,
    streamSources,
    suggestions,
    send,
    stop,
  };
}
