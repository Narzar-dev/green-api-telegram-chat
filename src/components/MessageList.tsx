import { useEffect, useRef } from 'react';
import { formatMessageTime } from '../entities/chat';
import type { Chat } from '../entities/chat';

interface MessageListProps {
  chat: Chat;
}

export default function MessageList({ chat }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat.messages?.length]);

  return (
    <div className="messages-area">
      <div className="date-divider"><span>Переписка</span></div>
      {!chat.messages?.length ? (
        <div className="conversation-empty">
          <div className="empty-illustration"><span>✉</span></div>
          <h2>Начните общение</h2>
          <p>Отправьте первое сообщение — оно появится здесь.</p>
          <span className="chat-id-note">ID чата: {chat.id}</span>
        </div>
      ) : (
        <div className="message-stack">
          {chat.messages.map((message) => (
            <div className={`message-line ${message.direction}`} key={message.id}>
              <div className="message-bubble">
                <p>{message.text}</p>
                <time>
                  {formatMessageTime(message.timestamp)}
                  {message.direction === 'outgoing' && <span className="read-mark">✓</span>}
                </time>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
