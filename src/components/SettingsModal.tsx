import type { FormEvent } from 'react';
import type { ConnectionStatus } from '../types';

interface SettingsModalProps {
  instanceId: string;
  token: string;
  connectionStatus: ConnectionStatus;
  connectionError: string;
  onChangeInstanceId: (value: string) => void;
  onChangeToken: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export default function SettingsModal({ instanceId, token, connectionStatus, connectionError, onChangeInstanceId, onChangeToken, onSubmit, onClose }: SettingsModalProps) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <button className="modal-close" type="button" aria-label="Закрыть" onClick={onClose}>×</button>
        <div className="modal-icon">✦</div>
        <span className="eyebrow">НАСТРОЙКА ИНТЕГРАЦИИ</span>
        <h2 id="settings-title">Подключить GREEN-API</h2>
        <p className="modal-description">Введите ID и токен Telegram-инстанса из личного кабинета GREEN-API.</p>

        <form onSubmit={onSubmit} className="settings-form">
          <label>
            ID инстанса
            <input inputMode="numeric" autoComplete="off" value={instanceId} onChange={(event) => onChangeInstanceId(event.target.value)} placeholder="Например, 4100000000" required />
          </label>
          <label>
            Токен инстанса
            <input type="password" autoComplete="new-password" value={token} onChange={(event) => onChangeToken(event.target.value)} placeholder="Вставьте токен из GREEN-API" required />
          </label>
          {connectionError && <div className="form-error" role="alert">{connectionError}</div>}
          <div className="setup-hint">
            <span>i</span>
            <p>Для получения сообщений оставьте <code>webhookUrl</code> пустым и включите <code>incomingWebhook</code>, <code>outgoingMessageWebhook</code> и <code>outgoingAPIMessageWebhook</code> в настройках инстанса.</p>
          </div>
          <button className="primary-button modal-submit" type="submit" disabled={connectionStatus === 'checking'}>
            {connectionStatus === 'checking' ? 'Проверяем…' : 'Подключиться'} <span>→</span>
          </button>
        </form>
        <p className="modal-security">Данные не отправляются на сторонние серверы приложения.</p>
      </section>
    </div>
  );
}
