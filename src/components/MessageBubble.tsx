import React from 'react';
import type { ChatMessage } from '../types/chat';

interface MessageBubbleProps {
  message: ChatMessage;
}

/** Split a line into text and link segments (https URLs + bare mdais.org paths). */
function lineToLinkParts(line: string): { type: 'text' | 'link'; value: string; href?: string }[] {
  const re = /(https?:\/\/[^\s<>"')\]]+|mdais\.org[^\s<>"')\]]*)/gi;
  const parts: { type: 'text' | 'link'; value: string; href?: string }[] = [];
  let lastIndex = 0;
  for (const m of line.matchAll(re)) {
    const idx = m.index ?? 0;
    const raw = m[0];
    if (idx > lastIndex) {
      parts.push({ type: 'text', value: line.slice(lastIndex, idx) });
    }
    const isFullUrl = /^https?:\/\//i.test(raw);
    const href = isFullUrl ? raw : `https://${raw.replace(/^\/+/, '')}`;
    parts.push({ type: 'link', value: raw, href });
    lastIndex = idx + raw.length;
  }
  if (lastIndex < line.length) {
    parts.push({ type: 'text', value: line.slice(lastIndex) });
  }
  if (parts.length === 0) {
    parts.push({ type: 'text', value: line });
  }
  return parts;
}

function renderBotLine(line: string, lineIndex: number) {
  const segments = lineToLinkParts(line);
  return (
    <React.Fragment key={lineIndex}>
      {segments.map((seg, i) =>
        seg.type === 'link' && seg.href ? (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-700 break-all"
          >
            {seg.value}
          </a>
        ) : (
          <React.Fragment key={i}>{seg.value}</React.Fragment>
        ),
      )}
    </React.Fragment>
  );
}

export const TypingIndicator: React.FC = () => (
  <div className="flex items-end gap-2 mb-3 message-enter" role="status" aria-label="הבוט מקליד">
    <div className="w-8 h-8 rounded-full bg-mda-red flex items-center justify-center shrink-0 self-end">
      <span className="text-white text-xs font-bold" aria-hidden="true">מד״א</span>
    </div>
    <div className="chat-bubble-bot px-4 py-3">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  </div>
);

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isBot = message.sender === 'bot';

  if (isBot) {
    const botLines = message.text.split('\n');
    return (
      <div className="flex items-end gap-2 mb-3 message-enter">
        <div
          className="w-8 h-8 rounded-full bg-mda-red flex items-center justify-center shrink-0 self-end"
          aria-hidden="true"
        >
          <span className="text-white text-xs font-bold">מד״א</span>
        </div>

        <div
          className="chat-bubble-bot px-4 py-3 max-w-[80%] text-sm leading-relaxed"
          role="article"
          aria-label={`הודעת בוט: ${message.text}`}
          dir="rtl"
        >
          {botLines.map((line, i) => (
            <React.Fragment key={i}>
              {renderBotLine(line, i)}
              {i < botLines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end justify-end gap-2 mb-3 message-enter">
      <div
        className="chat-bubble-user px-4 py-3 max-w-[80%] text-sm leading-relaxed"
        role="article"
        aria-label={`תשובתך: ${message.text}`}
        dir="rtl"
      >
        {message.text}
      </div>
    </div>
  );
};
