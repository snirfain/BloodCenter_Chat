import React from 'react';
import type { ChatMessage } from '../types/chat';

interface MessageBubbleProps {
  message: ChatMessage;
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
    return (
      <div className="flex items-end gap-2 mb-3 message-enter">
        {/* Bot avatar */}
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
          {/* Support newlines in bot messages */}
          {message.text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < message.text.split('\n').length - 1 && <br />}
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
