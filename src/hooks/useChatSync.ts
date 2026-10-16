import { useEffect } from 'react';
import type { GreenApiClient } from '../api/greenApi';
import type { Chat, ChatMessage } from '../entities/chat';

const SYNC_INTERVAL_MS = 20_000;

export function useChatSync(
  api: GreenApiClient | null,
  chat: Chat | null,
  mergeMessages: (chatKey: string, messages: ChatMessage[]) => void,
  onError: (error: unknown) => void,
): void {
  const chatKey = chat?.id;
  const recipientType = chat?.recipientType;

  useEffect(() => {
    if (!api || !chatKey) return undefined;

    const client = api;
    const key = chatKey;
    const controller = new AbortController();
    let timer: number | undefined;
    let resolvedChatId: string | undefined = recipientType === 'phone' ? undefined : key;
    let hasReportedError = false;

    async function sync(): Promise<void> {
      try {
        if (document.visibilityState !== 'hidden') {
          if (!resolvedChatId) {
            const chats = await client.getChats(controller.signal);
            resolvedChatId = chats.find((item) => String(item.phoneNumber) === key.replace(/\D/g, ''))?.chatId;
          }

          if (resolvedChatId) {
            const history = await client.getChatHistory(resolvedChatId, controller.signal);
            const messages: ChatMessage[] = Array.isArray(history) ? history
              .filter((item) => item.typeMessage === 'textMessage'
                && typeof item.textMessage === 'string'
                && typeof item.idMessage === 'string'
                && (item.type === 'incoming' || item.type === 'outgoing'))
              .map((item) => ({
                id: item.idMessage,
                text: item.textMessage ?? '',
                direction: item.type,
                timestamp: Number(item.timestamp) * 1000,
              })) : [];
            mergeMessages(key, messages);
          }
        }
        hasReportedError = false;
      } catch (error: unknown) {
        if (!controller.signal.aborted && !hasReportedError) {
          onError(error);
          hasReportedError = true;
        }
      } finally {
        if (!controller.signal.aborted) timer = window.setTimeout(sync, SYNC_INTERVAL_MS);
      }
    }

    void sync();
    return () => {
      controller.abort();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [api, chatKey, recipientType, mergeMessages, onError]);
}
