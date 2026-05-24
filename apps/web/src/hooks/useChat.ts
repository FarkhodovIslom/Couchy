import { useState, useCallback, useRef, useEffect } from 'react';
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

  // Load chat history from localStorage on mount or when sessionId changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`chat_history_${sessionId}`);
      if (stored) {
        setMessages(JSON.parse(stored));
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error('Failed to load chat history from localStorage:', e);
      setMessages([]);
    }
  }, [sessionId]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: ChatMessage = {
        id: `u_${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      };
      
      setMessages((prev) => {
        const next = [...prev, userMsg];
        try {
          localStorage.setItem(`chat_history_${sessionId}`, JSON.stringify(next));
        } catch (e) {
          console.error('Failed to save chat history to localStorage:', e);
        }
        return next;
      });

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
            setMessages((prev) => {
              const next = [
                ...prev,
                {
                  id: `a_${Date.now()}`,
                  role: 'assistant' as const,
                  content: fullContent || '—',
                  sources: finalSources,
                  createdAt: new Date().toISOString(),
                },
              ];
              try {
                localStorage.setItem(`chat_history_${sessionId}`, JSON.stringify(next));
              } catch (e) {
                console.error('Failed to save chat history to localStorage:', e);
              }
              return next;
            });
            setStreamContent('');
            setStreamSources([]);
            setIsStreaming(false);
            setIsThinking(false);
          },
          onError: (err) => {
            setMessages((prev) => {
              const next = [
                ...prev,
                {
                  id: `err_${Date.now()}`,
                  role: 'assistant' as const,
                  content: `Ошибка: ${err.message}`,
                  createdAt: new Date().toISOString(),
                },
              ];
              try {
                localStorage.setItem(`chat_history_${sessionId}`, JSON.stringify(next));
              } catch (e) {
                console.error('Failed to save chat history to localStorage:', e);
              }
              return next;
            });
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
      setMessages((prev) => {
        const next = [
          ...prev,
          {
            id: `a_${Date.now()}`,
            role: 'assistant' as const,
            content: streamContent + ' [остановлено]',
            createdAt: new Date().toISOString(),
          },
        ];
        try {
          localStorage.setItem(`chat_history_${sessionId}`, JSON.stringify(next));
        } catch (e) {
          console.error('Failed to save chat history to localStorage:', e);
        }
        return next;
      });
    }
    setStreamContent('');
    setStreamSources([]);
    setIsStreaming(false);
    setIsThinking(false);
  }, [streamContent, sessionId]);

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

