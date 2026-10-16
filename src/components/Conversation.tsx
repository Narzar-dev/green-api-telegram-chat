import { memo } from 'react';
import Avatar from './Avatar';
import MessageComposer from './MessageComposer';
import MessageList from './MessageList';
import { getChatTitle } from '../entities/chat';
import type { Chat } from '../entities/chat';

interface ConversationProps {
  chat: Chat;
  connected: boolean;
  sending: boolean;
  onSend: (text: string) => Promise<boolean>;
}

function Conversation({ chat, connected, sending, onSend }: ConversationProps) {
  return (
    <section className="conversation">
      <header className="conversation-header">
        <Avatar title={getChatTitle(chat)} small />
        <div className="conversation-person">
          <strong>{getChatTitle(chat)}</strong>
          <span><i className={connected ? 'online-indicator' : ''} />{connected ? 'в сети' : 'Чат Telegram'}</span>
        </div>
        <span className="conversation-label">ЛИЧНЫЙ ЧАТ</span>
      </header>
      <MessageList chat={chat} />
      <MessageComposer connected={connected} sending={sending} onSend={onSend} />
    </section>
  );
}

export default memo(Conversation);
