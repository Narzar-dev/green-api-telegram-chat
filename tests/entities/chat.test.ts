import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addMessageToChat,
  formatMessageTime,
  getChatTitle,
  loadChatHistory,
  MAX_MESSAGES_PER_CHAT,
  mergeChatMessages,
  saveChatHistory,
  upsertChatInHistory,
} from '../../src/entities/chat';
import type { Chat, ChatMessage } from '../../src/entities/chat';

const baseChat: Chat = {
  id: '10000000',
  name: 'Alice',
  messages: [],
  updatedAt: 1,
};

test('addMessageToChat appends a message and updates chat time', () => {
  const message: ChatMessage = {
    id: 'message-1',
    text: 'Привет',
    direction: 'incoming',
    timestamp: 1234,
  };

  const updated = addMessageToChat(baseChat, message);

  assert.deepEqual(updated.messages, [message]);
  assert.equal(updated.updatedAt, message.timestamp);
  assert.deepEqual(baseChat.messages, []);
});

test('addMessageToChat preserves the same object for a repeated notification', () => {
  const message: ChatMessage = { id: 'repeat-1', text: 'Привет', direction: 'incoming', timestamp: 1234 };
  const chat = addMessageToChat(baseChat, message);
  assert.equal(addMessageToChat(chat, message), chat);
});

test('upsertChatInHistory changes only the affected chat and ignores duplicate messages', () => {
  const otherChat: Chat = { ...baseChat, id: '20000000', name: 'Bob' };
  const history = { [baseChat.id]: baseChat, [otherChat.id]: otherChat };
  const message: ChatMessage = { id: 'new-1', text: 'Новое', direction: 'incoming', timestamp: 2000 };

  const changed = upsertChatInHistory(history, baseChat.id, {}, message);
  assert.notEqual(changed, history);
  assert.notEqual(changed[baseChat.id], baseChat);
  assert.equal(changed[otherChat.id], otherChat);
  assert.equal(upsertChatInHistory(changed, baseChat.id, {}, message), changed);
});

test('incoming Telegram chat ID is matched to a dialog created by phone number', () => {
  const phoneChat: Chat = { ...baseChat, id: '+7 913 530-89-97', recipientType: 'phone' };
  const history = { [phoneChat.id]: phoneChat };
  const reply: ChatMessage = { id: 'reply-1', text: 'Ответ', direction: 'incoming', timestamp: 2000 };

  const updated = upsertChatInHistory(history, '10000000', { name: 'Alice' }, reply, '79135308997');
  assert.equal(updated[phoneChat.id].messages[0], reply);
  assert.equal(updated['10000000'], undefined);
});

test('history sync merges only missing messages into the selected dialog', () => {
  const existing: ChatMessage = { id: 'sent-1', text: 'Привет', direction: 'outgoing', timestamp: 1000 };
  const reply: ChatMessage = { id: 'reply-1', text: 'Ответ', direction: 'incoming', timestamp: 2000 };
  const chat: Chat = { ...baseChat, messages: [existing] };
  const other: Chat = { ...baseChat, id: '20000000' };
  const history = { [chat.id]: chat, [other.id]: other };

  const updated = mergeChatMessages(history, chat.id, [reply, existing]);
  assert.deepEqual(updated[chat.id].messages, [existing, reply]);
  assert.equal(updated[other.id], other);
  assert.equal(mergeChatMessages(updated, chat.id, [reply, existing]), updated);
});

test('addMessageToChat keeps only the latest messages', () => {
  const previousMessages = Array.from({ length: MAX_MESSAGES_PER_CHAT }, (_, index): ChatMessage => ({
    id: `message-${index}`,
    text: `${index}`,
    direction: 'incoming',
    timestamp: index,
  }));
  const chat = { ...baseChat, messages: previousMessages };
  const newest: ChatMessage = { id: 'newest', text: 'new', direction: 'outgoing', timestamp: 999 };

  const updated = addMessageToChat(chat, newest);

  assert.equal(updated.messages.length, MAX_MESSAGES_PER_CHAT);
  assert.equal(updated.messages.at(-1)?.id, newest.id);
  assert.equal(updated.messages[0]?.id, 'message-1');
});

test('getChatTitle falls back to the chat ID and then to a default title', () => {
  assert.equal(getChatTitle(baseChat), 'Alice');
  assert.equal(getChatTitle({ ...baseChat, name: '' }), '10000000');
  assert.equal(getChatTitle(undefined), 'Новый чат');
});

test('formatMessageTime returns a readable Russian time', () => {
  const formatted = formatMessageTime(new Date(2026, 0, 2, 9, 7).getTime());
  assert.match(formatted, /^09:07$/);
});

test('history storage saves valid chats and skips malformed entries when loading', (context) => {
  const values = new Map<string, string>();
  const originalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } satisfies Pick<Storage, 'getItem' | 'setItem'>,
  });
  context.after(() => {
    if (originalStorage) {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalStorage });
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  saveChatHistory({ [baseChat.id]: baseChat });
  assert.deepEqual(loadChatHistory(), { [baseChat.id]: baseChat });

  values.set('green-api-telegram-chat-history-v1', JSON.stringify({
    [baseChat.id]: baseChat,
    malformed: { id: 'broken', messages: ['not a message'] },
  }));
  assert.deepEqual(loadChatHistory(), { [baseChat.id]: baseChat });
});
