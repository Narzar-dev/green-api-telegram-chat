import { memo } from 'react';
import { formatMessageTime, getChatTitle } from '../entities/chat';
import type { Chat } from '../entities/chat';
import Avatar from './Avatar';

interface ChatRowProps {
  chat: Chat;
  selected: boolean;
  onSelect: (chatId: string) => void;
}

function ChatRow({ chat, selected, onSelect }: ChatRowProps) {
  const lastMessage = chat.messages.at(-1);

  return (
    <button type="button" className={`chat-row ${selected ? 'selected' : ''}`} onClick={() => onSelect(chat.id)}>
      <Avatar title={getChatTitle(chat)} />
      <span className="chat-row-copy">
        <span className="chat-row-top">
          <strong>{getChatTitle(chat)}</strong>
          <time>{lastMessage ? formatMessageTime(lastMessage.timestamp) : ''}</time>
        </span>
        <span className="chat-preview">{lastMessage?.text || 'Начните переписку'}</span>
      </span>
    </button>
  );
}

export default memo(ChatRow);
