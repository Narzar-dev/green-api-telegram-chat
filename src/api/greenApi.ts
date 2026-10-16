// Общий адрес GREEN-API для Telegram. idInstance и токен остаются в state приложения.
import type { RecipientType } from '../entities/chat';
const protocol = 'https://';
const TELEGRAM_API_URL = 'api.green-api.com';

export interface GreenApiCredentials {
  instanceId: string;
  token: string;
}

export interface IncomingChatMessage {
  id: string;
  chatId: string;
  name: string;
  text: string;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
  phoneNumber?: string;
}

export interface GreenApiChat {
  chatId: string;
  phoneNumber?: number;
}

export interface ChatHistoryMessage {
  type: 'incoming' | 'outgoing';
  idMessage: string;
  timestamp: number;
  chatId: string;
  typeMessage: string;
  textMessage?: string;
}

export interface SendMessageResponse {
  idMessage?: string;
}

export interface ReceiveNotificationResponse {
  receiptId?: string | number;
  body?: unknown;
}

export interface GreenApiClient {
  sendMessage(recipientType: RecipientType, recipientId: string, message: string): Promise<SendMessageResponse>;
  receiveNotification(signal: AbortSignal): Promise<ReceiveNotificationResponse | null>;
  deleteNotification(receiptId: string | number): Promise<unknown>;
  getChats(signal: AbortSignal): Promise<GreenApiChat[]>;
  getChatHistory(chatId: string, signal: AbortSignal): Promise<ChatHistoryMessage[]>;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  payload?: unknown;
  signal?: AbortSignal;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function formatRecipientChatId(recipientType: RecipientType, recipientId: string): string {
  const value = recipientId.trim();
  if (!value) throw new Error('Введите телефон или ID чата.');
  if (recipientType === 'chat') return value;

  const phone = value.replace(/[\s()+.-]/g, '');
  if (!/^\d+$/.test(phone)) throw new Error('Номер телефона должен содержать только цифры и символы форматирования.');
  return `${phone}@c.us`;
}

export function createGreenApi({ instanceId, token }: GreenApiCredentials): GreenApiClient {
  const id = instanceId.trim();
  const secret = token.trim();

  if (!/^\d+$/.test(id)) {
    throw new Error('ID инстанса должен содержать только цифры.');
  }
  if (!secret) {
    throw new Error('Введите токен инстанса.');
  }

  const methodUrl = (method: string): string => `${protocol}${id.slice(0, 4)}.${TELEGRAM_API_URL}/waInstance${id}/${method}/${encodeURIComponent(secret)}`;

  async function request<TResponse>(url: string, { method = 'GET', payload, signal }: RequestOptions = {}): Promise<TResponse> {
    const response = await fetch(url, {
      method,
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal,
    });
    return readResponse<TResponse>(response);
  }

  return {
    sendMessage: (recipientType: RecipientType, recipientId: string, message: string) => request<SendMessageResponse>(methodUrl('sendMessage'), {
      method: 'POST',
      payload: { chatId: formatRecipientChatId(recipientType, recipientId), message, typingTime: 1000 },
    }),
    receiveNotification: async (signal: AbortSignal) => {
      const response = await fetch(`${methodUrl('receiveNotification')}?receiveTimeout=5`, { signal });
      if (response.status === 304) return null;
      return readResponse<ReceiveNotificationResponse | null>(response);
    },
    deleteNotification: (receiptId: string | number) => request<unknown>(
      `${methodUrl('deleteNotification')}/${encodeURIComponent(receiptId)}`,
      { method: 'DELETE' },
    ),
    getChats: (signal: AbortSignal) => request<GreenApiChat[]>(methodUrl('getChats'), { signal }),
    getChatHistory: (chatId: string, signal: AbortSignal) => request<ChatHistoryMessage[]>(methodUrl('getChatHistory'), {
      method: 'POST',
      payload: { chatId, count: 30 },
      signal,
    }),
  };
}

async function readResponse<TResponse>(response: Response): Promise<TResponse> {
  const text = await response.text();
  let result: unknown;
  try { result = text ? JSON.parse(text) : null; } catch { result = text; }
  if (!response.ok) {
    const detail = typeof result === 'string'
      ? result
      : isRecord(result) && typeof result.message === 'string'
        ? result.message
        : isRecord(result) && typeof result.error === 'string'
          ? result.error
          : '';
    throw new Error(detail || `GREEN-API ответил с кодом ${response.status}.`);
  }
  return result as TResponse;
}

export function readIncomingMessage(notification: ReceiveNotificationResponse): IncomingChatMessage | null {
  if (!isRecord(notification.body)) return null;
  const body = notification.body;
  const direction = body.typeWebhook === 'incomingMessageReceived'
    ? 'incoming'
    : body.typeWebhook === 'outgoingMessageReceived' || body.typeWebhook === 'outgoingAPIMessageReceived'
      ? 'outgoing'
      : null;
  if (!direction || !isRecord(body.senderData) || !isRecord(body.messageData)) return null;

  const sender = body.senderData;
  const messageData = body.messageData;
  if (!isRecord(messageData.textMessageData)) return null;

  const chatId = sender.chatId;
  const text = messageData.textMessageData.textMessage;
  if (typeof chatId !== 'string' || !chatId || typeof text !== 'string' || !text) return null;
  const timestamp = typeof body.timestamp === 'number' ? body.timestamp : Number(body.timestamp);

  return {
    id: typeof body.idMessage === 'string' ? body.idMessage : `${timestamp}-${chatId}`,
    chatId,
    name: typeof sender.chatName === 'string' ? sender.chatName : typeof sender.senderName === 'string' ? sender.senderName : chatId,
    text,
    timestamp: Number.isFinite(timestamp) && timestamp > 0 ? timestamp * 1000 : Date.now(),
    direction,
    ...(direction === 'incoming' && typeof sender.senderPhoneNumber === 'number' && sender.senderPhoneNumber > 0
      ? { phoneNumber: String(sender.senderPhoneNumber) }
      : {}),
  };
}
