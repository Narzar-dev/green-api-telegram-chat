import assert from 'node:assert/strict';
import test from 'node:test';
import { createGreenApi, readIncomingMessage } from '../../src/api/greenApi';

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('createGreenApi rejects an invalid instance ID and an empty token', () => {
  assert.throws(() => createGreenApi({ instanceId: '41abc', token: 'token' }), /только цифры/);
  assert.throws(() => createGreenApi({ instanceId: '4100000000', token: '  ' }), /токен/);
});

test('sendMessage posts Telegram chat ID and text directly to GREEN-API', async (context) => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return jsonResponse({ idMessage: 'sent-123' });
  }) as typeof fetch;
  context.after(() => { globalThis.fetch = originalFetch; });

  const api = createGreenApi({ instanceId: '4100000000', token: 'secure/token' });
  const response = await api.sendMessage('chat', '10000000', 'Привет');

  assert.equal(requestUrl, 'https://4100.api.green-api.com/waInstance4100000000/sendMessage/secure%2Ftoken');
  assert.equal(requestInit?.method, 'POST');
  assert.equal(new Headers(requestInit?.headers).get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(String(requestInit?.body)), { chatId: '10000000', message: 'Привет', typingTime: 1000 });
  assert.equal(response.idMessage, 'sent-123');
});

test('sendMessage adds @c.us only for phone recipients and keeps chat IDs unchanged', async (context) => {
  const originalFetch = globalThis.fetch;
  const payloads: unknown[] = [];
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    payloads.push(JSON.parse(String(init?.body)));
    return jsonResponse({ idMessage: 'sent' });
  }) as typeof fetch;
  context.after(() => { globalThis.fetch = originalFetch; });

  const api = createGreenApi({ instanceId: '4100000000', token: 'token' });
  await api.sendMessage('phone', '+7 (913) 530-89-97', 'На телефон');
  await api.sendMessage('chat', '-100123456', 'В чат');

  assert.deepEqual(payloads, [
    { chatId: '79135308997@c.us', message: 'На телефон', typingTime: 1000 },
    { chatId: '-100123456', message: 'В чат', typingTime: 1000 },
  ]);
});

test('receiveNotification uses a bounded long poll and forwards its abort signal', async (context) => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  const controller = new AbortController();
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requestUrl = String(input);
    return jsonResponse({ receiptId: 7, body: {} });
  }) as typeof fetch;
  context.after(() => { globalThis.fetch = originalFetch; });

  const notification = await createGreenApi({ instanceId: '4100000000', token: 'token' })
    .receiveNotification(controller.signal);

  assert.equal(requestUrl, 'https://4100.api.green-api.com/waInstance4100000000/receiveNotification/token?receiveTimeout=5');
  assert.equal(notification?.receiptId, 7);
});

test('receiveNotification treats HTTP 304 as no changes', async (context) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(null, { status: 304 })) as typeof fetch;
  context.after(() => { globalThis.fetch = originalFetch; });

  const result = await createGreenApi({ instanceId: '4100000000', token: 'token' })
    .receiveNotification(new AbortController().signal);
  assert.equal(result, null);
});

test('deleteNotification sends DELETE for the specific receipt', async (context) => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  let requestMethod = '';
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestUrl = String(input);
    requestMethod = init?.method || '';
    return jsonResponse({});
  }) as typeof fetch;
  context.after(() => { globalThis.fetch = originalFetch; });

  await createGreenApi({ instanceId: '4100000000', token: 'token' }).deleteNotification(123);

  assert.equal(requestUrl, 'https://4100.api.green-api.com/waInstance4100000000/deleteNotification/token/123');
  assert.equal(requestMethod, 'DELETE');
});

test('GREEN-API error responses become readable errors', async (context) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => jsonResponse({ message: 'Invalid token' }, 400)) as typeof fetch;
  context.after(() => { globalThis.fetch = originalFetch; });

  await assert.rejects(
    createGreenApi({ instanceId: '4100000000', token: 'bad-token' }).sendMessage('chat', '10000000', 'Привет'),
    /Invalid token/,
  );
});

test('readIncomingMessage maps a Telegram text notification to a chat message', () => {
  const incoming = readIncomingMessage({
    body: {
      typeWebhook: 'incomingMessageReceived',
      timestamp: 1760000000,
      idMessage: 'message-123',
      senderData: { chatId: '10000000', chatName: 'Alice' },
      messageData: { textMessageData: { textMessage: 'Привет' } },
    },
  });

  assert.deepEqual(incoming, {
    id: 'message-123',
    chatId: '10000000',
    name: 'Alice',
    text: 'Привет',
    timestamp: 1760000000000,
    direction: 'incoming',
  });
});

test('readIncomingMessage includes the sender phone for matching a phone dialog', () => {
  const message = readIncomingMessage({
    body: {
      typeWebhook: 'incomingMessageReceived',
      timestamp: 1760000000,
      idMessage: 'reply-1',
      senderData: { chatId: '10000000', senderPhoneNumber: 79135308997 },
      messageData: { textMessageData: { textMessage: 'Ответ' } },
    },
  });
  assert.equal(message?.phoneNumber, '79135308997');
});

test('getChats and getChatHistory request the data needed to recover a missed reply', async (context) => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), init });
    return jsonResponse([]);
  }) as typeof fetch;
  context.after(() => { globalThis.fetch = originalFetch; });

  const api = createGreenApi({ instanceId: '4100000000', token: 'token' });
  const signal = new AbortController().signal;
  await api.getChats(signal);
  await api.getChatHistory('10000000', signal);

  assert.match(requests[0].url, /\/getChats\/token$/);
  assert.match(requests[1].url, /\/getChatHistory\/token$/);
  assert.deepEqual(JSON.parse(String(requests[1].init?.body)), { chatId: '10000000', count: 30 });
});

test('readIncomingMessage also maps self-sent Telegram messages as outgoing', () => {
  const sentToSelf = readIncomingMessage({
    body: {
      typeWebhook: 'outgoingMessageReceived',
      timestamp: 1760000001,
      idMessage: 'message-self',
      senderData: { chatId: '10000000', chatName: 'Saved Messages' },
      messageData: { textMessageData: { textMessage: 'Сообщение себе' } },
    },
  });

  assert.equal(sentToSelf?.direction, 'outgoing');
  assert.equal(sentToSelf?.text, 'Сообщение себе');
});

test('readIncomingMessage handles messages sent through GREEN-API', () => {
  const message = readIncomingMessage({
    body: {
      typeWebhook: 'outgoingAPIMessageReceived',
      timestamp: 1760000002,
      idMessage: 'sent-api-1',
      senderData: { chatId: '10000000', chatName: 'Alice' },
      messageData: { textMessageData: { textMessage: 'Отправлено через API' } },
    },
  });

  assert.equal(message?.direction, 'outgoing');
  assert.equal(message?.id, 'sent-api-1');
});

test('readIncomingMessage ignores unrelated and malformed notifications', () => {
  assert.equal(readIncomingMessage({ body: { typeWebhook: 'outgoingMessageStatus' } }), null);
  assert.equal(readIncomingMessage({ body: { typeWebhook: 'incomingMessageReceived' } }), null);
});
