import { useCallback, useEffect, useState } from 'react';
import { loadChatHistory, mergeChatMessages, saveChatHistory, upsertChatInHistory } from '../entities/chat';
import type { ChatHistory, ChatMessage, ChatPatch } from '../entities/chat';

export function useChatHistory() {
  const [chats, setChats] = useState<ChatHistory>(loadChatHistory);

  useEffect(() => saveChatHistory(chats), [chats]);

  const upsertChat = useCallback((chatId: string, patch: ChatPatch = {}, message?: ChatMessage, senderPhoneNumber?: string): void => {
    setChats((current) => upsertChatInHistory(current, chatId, patch, message, senderPhoneNumber));
  }, []);

  const mergeMessages = useCallback((chatKey: string, messages: ChatMessage[]): void => {
    setChats((current) => mergeChatMessages(current, chatKey, messages));
  }, []);

  return { chats, upsertChat, mergeMessages };
}
