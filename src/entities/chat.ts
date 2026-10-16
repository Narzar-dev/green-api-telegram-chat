export const MAX_MESSAGES_PER_CHAT = 250;
const HISTORY_KEY = 'green-api-telegram-chat-history-v1';

export type MessageDirection = 'incoming' | 'outgoing';
export type RecipientType = 'phone' | 'chat';

export interface ChatMessage {
  id: string;
  text: string;
  direction: MessageDirection;
  timestamp: number;
}

export interface Chat {
  id: string;
  name: string;
  recipientType?: RecipientType;
  messages: ChatMessage[];
  updatedAt: number;
}

export type ChatPatch = Partial<Pick<Chat, 'name' | 'recipientType'>>;
export type ChatHistory = Record<string, Chat>;

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<ChatMessage>;
  return typeof message.id === 'string'
    && typeof message.text === 'string'
    && (message.direction === 'incoming' || message.direction === 'outgoing')
    && typeof message.timestamp === 'number';
}

function isChat(value: unknown): value is Chat {
  if (!value || typeof value !== 'object') return false;
  const chat = value as Partial<Chat>;
  return typeof chat.id === 'string'
    && typeof chat.name === 'string'
    && (chat.recipientType === undefined || chat.recipientType === 'phone' || chat.recipientType === 'chat')
    && Array.isArray(chat.messages)
    && chat.messages.every(isChatMessage)
    && typeof chat.updatedAt === 'number';
}

export function loadChatHistory(): ChatHistory {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};

    return Object.fromEntries(
      Object.entries(saved).filter((entry): entry is [string, Chat] => isChat(entry[1])),
    );
  } catch {
    return {};
  }
}

export function saveChatHistory(chats: ChatHistory): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(chats));
  } catch {
    // История остаётся в памяти до закрытия вкладки, если хранилище недоступно.
  }
}

export function getChatTitle(chat: Chat | null | undefined): string {
  return chat?.name || chat?.id || 'Новый чат';
}

export function formatMessageTime(timestamp: number): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

export function addMessageToChat(chat: Chat, message: ChatMessage): Chat {
  if (chat.messages.some((existing) => existing.id === message.id)) return chat;
  return {
    ...chat,
    messages: [...(chat.messages || []), message].slice(-MAX_MESSAGES_PER_CHAT),
    updatedAt: message.timestamp || Date.now(),
  };
}

export function upsertChatInHistory(history: ChatHistory, chatId: string, patch: ChatPatch = {}, message?: ChatMessage, senderPhoneNumber?: string): ChatHistory {
  const phoneId = chatId.endsWith('@c.us') ? chatId.slice(0, -5) : chatId;
  const matchingPhone = senderPhoneNumber && Object.keys(history).find((candidate) =>
    history[candidate].recipientType === 'phone' && candidate.replace(/\D/g, '') === senderPhoneNumber,
  );
  const key = matchingPhone || (history[phoneId]?.recipientType === 'phone' ? phoneId : chatId);
  const previous = history[key];

  if (previous && message && previous.messages.some((item) => item.id === message.id)) return history;
  if (previous && !message && Object.entries(patch).every(([field, value]) => previous[field as keyof Chat] === value)) return history;

  const chat: Chat = previous || { id: key, name: key, messages: [], updatedAt: Date.now() };
  const updated = message
    ? addMessageToChat({ ...chat, ...patch }, message)
    : { ...chat, ...patch, updatedAt: Date.now() };
  return { ...history, [key]: updated };
}

export function mergeChatMessages(history: ChatHistory, chatKey: string, messages: ChatMessage[]): ChatHistory {
  const chat = history[chatKey];
  if (!chat || messages.length === 0) return history;

  const knownIds = new Set(chat.messages.map((message) => message.id));
  const added = messages.filter((message) => {
    if (knownIds.has(message.id)) return false;
    knownIds.add(message.id);
    return true;
  });
  if (added.length === 0) return history;

  const allMessages = [...chat.messages, ...added]
    .sort((left, right) => left.timestamp - right.timestamp)
    .slice(-MAX_MESSAGES_PER_CHAT);
  return {
    ...history,
    [chatKey]: { ...chat, messages: allMessages, updatedAt: allMessages.at(-1)?.timestamp ?? chat.updatedAt },
  };
}
