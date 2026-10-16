import { useEffect } from 'react';
import { readIncomingMessage } from '../api/greenApi';
import type { Dispatch, SetStateAction } from 'react';
import type { IncomingChatMessage, GreenApiClient } from '../api/greenApi';
import type { ConnectionStatus } from '../types';

const FIRST_RETRY_DELAY = 1200;
const MAX_RETRY_DELAY = 15000;
const EMPTY_POLL_DELAY = 500;

export function useIncomingMessages(
  api: GreenApiClient | null,
  onIncomingMessage: (message: IncomingChatMessage) => void,
  onReceiveError: (error: unknown) => void,
  setConnectionStatus: Dispatch<SetStateAction<ConnectionStatus>>,
): void {
  useEffect(() => {
    if (!api) return undefined;

    const client = api;
    const controller = new AbortController();

    async function receiveLoop(): Promise<void> {
      let retryDelay = FIRST_RETRY_DELAY;
      let hasReportedError = false;

      while (!controller.signal.aborted) {
        try {
          const notification = await client.receiveNotification(controller.signal);
          retryDelay = FIRST_RETRY_DELAY;
          hasReportedError = false;
          setConnectionStatus((status) => status === 'connected' ? status : 'connected');

          if (!notification) {
            await new Promise((resolve) => window.setTimeout(resolve, EMPTY_POLL_DELAY));
            continue;
          }

          const incoming = readIncomingMessage(notification);
          if (incoming) onIncomingMessage(incoming);

          if (notification.receiptId !== undefined) {
            await client.deleteNotification(notification.receiptId);
          }
        } catch (error: unknown) {
          if (controller.signal.aborted) return;

          setConnectionStatus('retrying');
          if (!hasReportedError) {
            onReceiveError(error);
            hasReportedError = true;
          }
          await new Promise((resolve) => window.setTimeout(resolve, retryDelay));
          retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
        }
      }
    }

    receiveLoop();
    return () => controller.abort();
  }, [api, onIncomingMessage, onReceiveError, setConnectionStatus]);
}
