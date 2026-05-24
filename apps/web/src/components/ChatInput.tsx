'use client';

import React, { useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export default function ChatInput({ value, onChange, onSubmit, onStop, isStreaming, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Refocus input after streaming ends
  useEffect(() => {
    if (!isStreaming) inputRef.current?.focus();
  }, [isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isStreaming) {
        onStop();
      } else if (value.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Задайте вопрос..."
        disabled={disabled}
        style={{
          flex: 1,
          padding: '10px 14px',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          outline: 'none',
          transition: 'border-color var(--dur-fast) var(--ease-ios)',
          opacity: disabled ? 0.5 : 1,
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--border)';
        }}
      />

      {/* Send / Stop button */}
      <button
        type="button"
        onClick={isStreaming ? onStop : onSubmit}
        disabled={!isStreaming && (!value.trim() || disabled)}
        style={{
          width: '36px',
          height: '36px',
          flexShrink: 0,
          backgroundColor: isStreaming ? 'var(--bg-elevated)' : 'var(--accent)',
          border: isStreaming ? '1px solid var(--border)' : 'none',
          borderRadius: '8px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: '16px',
          cursor: !isStreaming && (!value.trim() || disabled) ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: !isStreaming && (!value.trim() || disabled) ? 0.35 : 1,
          transition: `background-color var(--dur-fast) var(--ease-ios),
                       transform var(--dur-fast) var(--ease-spring)`,
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          if (!isStreaming && (!value.trim() || disabled)) return;
          el.style.transform = 'scale(1.06)';
          if (!isStreaming) el.style.backgroundColor = 'var(--accent-hover)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = 'scale(1)';
          if (!isStreaming) el.style.backgroundColor = 'var(--accent)';
        }}
        onMouseDown={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(0.88)';
        }}
        onMouseUp={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)';
        }}
        title={isStreaming ? 'Остановить генерацию' : 'Отправить'}
      >
        {isStreaming ? <Square size={14} /> : <Send size={14} />}
      </button>
    </div>
  );
}
