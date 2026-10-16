import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createGreenApi } from './api/greenApi';
import type { GreenApiClient, IncomingChatMessage } from './api/greenApi';
import ChatSidebar from './components/ChatSidebar';
import Conversation from './components/Conversation';
import SettingsModal from './components/SettingsModal';
import WelcomePanel from './components/WelcomePanel';
import { useChatHistory } from './hooks/useChatHistory';
import { useChatSync } from './hooks/useChatSync';
import { useIncomingMessages } from './hooks/useIncomingMessages';
import type { ConnectionStatus } from './types';
import type { RecipientType } from './entities/chat';

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [instanceId, setInstanceId] = useState('');
  const [token, setToken] = useState('');
  const [api, setApi] = useState<GreenApiClient | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [connectionError, setConnectionError] = useState('');
  const [selectedChatId, setSelectedChatId] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const { chats, upsertChat, mergeMessages } = useChatHistory();
  const selectedChat = selectedChatId ? chats[selectedChatId] : null;
  const connected = Boolean(api);

  const handleIncomingMessage = useCallback((incoming: IncomingChatMessage) => {
    upsertChat(incoming.chatId, { name: incoming.name }, {
      id: incoming.id,
      text: incoming.text,
      direction: incoming.direction,
      timestamp: incoming.timestamp,
    }, incoming.phoneNumber);
  }, [upsertChat]);

  const statusLabel = (() => {
    if (connectionStatus === 'checking') return 'Подключаемся…';
    if (connectionStatus === 'retrying') return 'Переподключение';
    return connected ? 'Подключено' : 'Не подключено';
  })();

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((message: string): void => {
    setToast(message);
  }, []);

  const handleReceiveError = useCallback((error: unknown): void => {
    const message = error instanceof Error ? error.message : 'Не удалось получить уведомления GREEN-API.';
    showToast(`Ошибка получения сообщений: ${message}`);
  }, [showToast]);

  useIncomingMessages(api, handleIncomingMessage, handleReceiveError, setConnectionStatus);
  useChatSync(api, selectedChat, mergeMessages, handleReceiveError);

  function connect(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setConnectionError('');

    try {
      const greenApi = createGreenApi({ instanceId, token });
      setConnectionStatus('connected');
      setApi(greenApi);
      setSettingsOpen(false);
      showToast('Данные подключения сохранены');
    } catch (error: unknown) {
      setConnectionStatus('error');
      setConnectionError(error instanceof Error ? error.message : 'Проверьте данные GREEN-API.');
    }
  }

  function createChat(recipient: { type: RecipientType; value: string }): void {
    upsertChat(recipient.value, { name: recipient.value, recipientType: recipient.type });
    setSelectedChatId(recipient.value);
  }

  const sendMessage = useCallback(async (text: string): Promise<boolean> => {
    const messageText = text.trim();
    if (!messageText || !selectedChatId || !api || sending) return false;

    setSending(true);
    try {
      const result = await api.sendMessage(selectedChat?.recipientType ?? 'chat', selectedChatId, messageText);
      upsertChat(selectedChatId, {}, {
        id: result?.idMessage || `local-${Date.now()}`,
        text: messageText,
        direction: 'outgoing',
        timestamp: Date.now(),
      });
      return true;
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Не удалось отправить сообщение');
      return false;
    } finally {
      setSending(false);
    }
  }, [api, selectedChatId, selectedChat?.recipientType, sending, showToast, upsertChat]);

  return (
    <main className="app-shell">
      <section className="chat-app" aria-label="Чат Telegram через GREEN-API">
        <ChatSidebar
          chats={chats}
          selectedChatId={selectedChatId}
          connected={connected}
          statusLabel={statusLabel}
          onSelectChat={setSelectedChatId}
          onCreateChat={createChat}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        {selectedChat
          ? <Conversation chat={selectedChat} connected={connected} sending={sending} onSend={sendMessage} />
          : <WelcomePanel onConnect={() => setSettingsOpen(true)} />}
      </section>

      {settingsOpen && (
        <SettingsModal
          instanceId={instanceId}
          token={token}
          connectionStatus={connectionStatus}
          connectionError={connectionError}
          onChangeInstanceId={setInstanceId}
          onChangeToken={setToken}
          onSubmit={connect}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
