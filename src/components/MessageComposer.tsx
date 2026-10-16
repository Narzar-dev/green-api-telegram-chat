import { useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import Icon from './Icon';

interface MessageComposerProps {
  connected: boolean;
  sending: boolean;
  onSend: (text: string) => Promise<boolean>;
}

export default function MessageComposer({ connected, sending, onSend }: MessageComposerProps) {
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const sent = await onSend(message);
    if (sent) setMessage('');
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder={connected ? 'Напишите сообщение…' : 'Сначала подключите GREEN-API'}
        aria-label="Текст сообщения"
        disabled={!connected}
        maxLength={4096}
        rows={1}
      />
      <div className="composer-bottom">
        <span>Enter — отправить · Shift + Enter — новая строка</span>
        <button type="submit" disabled={!connected || !message.trim() || sending} aria-label="Отправить сообщение">
          {sending ? <span className="spinner" /> : <Icon name="send" size={17} />}
          <span>Отправить</span>
        </button>
      </div>
    </form>
  );
}
