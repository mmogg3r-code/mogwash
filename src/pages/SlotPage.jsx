import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export default function SlotPage({ slots }) {
  const { slotId } = useParams();
  const slot = slots.find((item) => item.id === slotId);
  const defaultReels = useMemo(() => ['🍒', '7️⃣', '💎', '🍋', '⭐'], []);
  const [reels, setReels] = useState(defaultReels);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState('Hit spin to start the demo reel.');

  if (!slot) {
    return (
      <main className="layout">
        <h1>Machine not found</h1>
        <Link to="/">Back to lobby</Link>
      </main>
    );
  }

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setMessage('Spinning...');

    setTimeout(() => {
      const next = Array.from({ length: 5 }, () => pickRandom(slot.symbols));
      setReels(next);
      const jackpot = next.every((symbol) => symbol === '7️⃣');
      const triple = new Set(next).size <= 3;
      setMessage(jackpot ? 'JACKPOT! 7-7-7-7-7 🔥' : triple ? 'Nice hit! Combo win 💰' : 'No win this spin. Try again.');
      setSpinning(false);
    }, 900);
  };

  return (
    <main className="layout">
      <div className="slot-shell" style={{ '--accent': slot.accent }}>
        <p className="hero-eyebrow">{slot.subtitle}</p>
        <h1>{slot.name}</h1>

        <div className={`reels showcase ${spinning ? 'spinning' : ''}`}>
          {reels.map((symbol, index) => (
            <span key={`${symbol}-${index}`}>{symbol}</span>
          ))}
        </div>

        <p className="spin-msg">{message}</p>
        <div className="row">
          <button className="spin" onClick={spin} disabled={spinning}>
            {spinning ? 'Spinning...' : 'Spin Demo Reel'}
          </button>
          <Link to="/" className="open-link">
            Back to lobby
          </Link>
        </div>

        <p className="tiny">
          Demo spin is client-side only. Keep settlement logic in your secure backend/admin flow, then post results on
          chain via the bankroll contract.
        </p>
      </div>
    </main>
  );
}
