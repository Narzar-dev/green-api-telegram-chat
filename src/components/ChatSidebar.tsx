import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Chat, ChatHistory } from '../entities/chat';
import type { RecipientType } from '../entities/chat';
import ChatRow from './ChatRow';
import Icon from './Icon';
import { getChatTitle } from '../entities/chat';

interface ChatSidebarProps {
  chats: ChatHistory;
  selectedChatId: string;
  connected: boolean;
  statusLabel: string;
  onSelectChat: (chatId: string) => void;
  onCreateChat: (recipient: { type: RecipientType; value: string }) => void;
  onOpenSettings: () => void;
}

export default function ChatSidebar({ chats, selectedChatId, connected, statusLabel, onSelectChat, onCreateChat, onOpenSettings }: ChatSidebarProps) {
  const [search, setSearch] = useState('');
  const [newChatId, setNewChatId] = useState('');
  const [recipientType, setRecipientType] = useState<RecipientType>('phone');

  const chatList = useMemo(
    () => Object.values(chats).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [chats],
  );
  const visibleChats: Chat[] = chatList.filter((chat) => {
    const query = search.toLowerCase();
    return getChatTitle(chat).toLowerCase().includes(query) || chat.id.toLowerCase().includes(query);
  });

  function handleCreateChat(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const chatId = newChatId.trim();
    if (!chatId) return;

    onCreateChat({ type: recipientType, value: chatId });
    setNewChatId('');
  }

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <div className="brand-mark"><span>✦</span></div>
        <div className="brand-copy"><strong>Сообщения</strong><span>Telegram · GREEN-API</span></div>
        <button className="icon-button settings-button" type="button" aria-label="Настройки подключения" onClick={onOpenSettings}>
          <Icon name="settings" />
        </button>
      </header>

      <div className={`connection-pill ${connected ? 'is-online' : ''}`}>
        <span className="status-dot" />
        <span>{statusLabel}</span>
        <button type="button" className="connection-action" onClick={onOpenSettings}>
          {connected ? 'Настройки' : 'Подключить'}
        </button>
      </div>

      <div className="list-heading"><span>Чаты</span><span className="chat-count">{chatList.length}</span></div>
      <label className="search-box">
        <Icon name="search" size={18} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск чата" aria-label="Поиск чата" />
        {search && <button type="button" aria-label="Очистить поиск" onClick={() => setSearch('')}>×</button>}
      </label>

      <form className="new-chat-form" onSubmit={handleCreateChat}>
        <label htmlFor="new-chat">Новый диалог</label>
        <div className="new-chat-types" role="radiogroup" aria-label="Тип получателя">
          <label><input type="radio" name="recipient-type" value="phone" checked={recipientType === 'phone'} onChange={() => setRecipientType('phone')} /> Телефон</label>
          <label><input type="radio" name="recipient-type" value="chat" checked={recipientType === 'chat'} onChange={() => setRecipientType('chat')} /> ID чата</label>
        </div>
        <div className="new-chat-controls">
          <input id="new-chat" value={newChatId} onChange={(event) => setNewChatId(recipientType === 'phone' ? event.target.value.replace(/\D/g, '') : event.target.value)} placeholder={recipientType === 'phone' ? '79999999999' : 'ID чата Telegram'} inputMode={recipientType === 'phone' ? 'numeric' : 'text'} />
          <button type="submit" disabled={!newChatId.trim()} aria-label="Добавить чат"><Icon name="plus" size={18} /></button>
        </div>
      </form>

      <nav className="chat-list" aria-label="Список чатов">
        {visibleChats.length ? visibleChats.map((chat) => (
          <ChatRow key={chat.id} chat={chat} selected={chat.id === selectedChatId} onSelect={onSelectChat} />
        )) : <div className="empty-list">{search ? 'Ничего не найдено' : 'Здесь появятся ваши чаты'}</div>}
      </nav>

      <footer className="sidebar-footer">
        <span className="telegram-glyph">➤</span>
        <span><strong>Telegram</strong><small>Поддержка сообщений</small></span>
        <span className="footer-check"><Icon name="check" size={15} /></span>
      </footer>
    </aside>
  );
}
