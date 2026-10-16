interface WelcomePanelProps {
  onConnect: () => void;
}

export default function WelcomePanel({ onConnect }: WelcomePanelProps) {
  return (
    <div className="welcome-panel">
      <div className="welcome-art">
        <div className="art-orbit orbit-one" />
        <div className="art-orbit orbit-two" />
        <div className="art-paper"><span>✦</span><i>•••</i></div>
        <div className="art-dot dot-one" />
        <div className="art-dot dot-two" />
      </div>
      <span className="eyebrow">ВАШЕ ПРОСТРАНСТВО ДЛЯ ОБЩЕНИЯ</span>
      <h1>Все важные разговоры<br /><em>в одном месте</em></h1>
      <p>Подключите GREEN-API и откройте существующий диалог<br className="desktop-break" /> или создайте новый по ID чата Telegram.</p>
      <button type="button" className="primary-button" onClick={onConnect}>Подключить GREEN-API <span>→</span></button>
      <div className="welcome-footnote"><span>✳</span> Ваши сообщения остаются конфиденциальными</div>
    </div>
  );
}
