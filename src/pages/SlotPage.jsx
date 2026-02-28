import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

const PAYOUT_MULTIPLIERS = {
  jackpot77777: 120,
  fiveKind: 40,
  fourKind: 12,
  threeKind: 3,
  lose: 0
};

function evaluateSpin(symbols) {
  const counts = symbols.reduce((acc, symbol) => {
    acc[symbol] = (acc[symbol] || 0) + 1;
    return acc;
  }, {});

  const maxCount = Math.max(...Object.values(counts));
  const jackpot = symbols.every((symbol) => symbol === '7️⃣');

  if (jackpot) {
    return { key: 'jackpot77777', label: 'JACKPOT! 7-7-7-7-7 🔥', multiplier: PAYOUT_MULTIPLIERS.jackpot77777 };
  }
  if (maxCount === 5) {
    return { key: 'fiveKind', label: 'Five of a kind! Massive win 💎', multiplier: PAYOUT_MULTIPLIERS.fiveKind };
  }
  if (maxCount === 4) {
    return { key: 'fourKind', label: 'Four of a kind! Great hit ⚡', multiplier: PAYOUT_MULTIPLIERS.fourKind };
  }
  if (maxCount === 3) {
    return { key: 'threeKind', label: 'Triple match! Nice win 💰', multiplier: PAYOUT_MULTIPLIERS.threeKind };
  }

  return { key: 'lose', label: 'No win this spin. Try again.', multiplier: PAYOUT_MULTIPLIERS.lose };
}

export default function SlotPage({ slots }) {
  const { slotId } = useParams();
  const slot = slots.find((item) => item.id === slotId);
  const defaultReels = useMemo(() => ['🍒', '7️⃣', '💎', '🍋', '⭐'], []);
  const [reels, setReels] = useState(defaultReels);
  const [spinning, setSpinning] = useState(false);
  const [betAmount, setBetAmount] = useState(Number(slot?.minBet || 0.001));
  const [message, setMessage] = useState('Hit spin to start the demo reel.');
  const [lastWin, setLastWin] = useState(0);
  const [lastMultiplier, setLastMultiplier] = useState(0);

  if (!slot) {
    return (
      <main className="layout">
        <h1>Machine not found</h1>
        <Link to="/">Back to lobby</Link>
      </main>
    );
  }

  const potentialTopWin = (Number(betAmount) * PAYOUT_MULTIPLIERS.jackpot77777).toFixed(4);

  const spin = () => {
    if (spinning) return;

    const bet = Number(betAmount);
    const minBet = Number(slot.minBet);
    if (Number.isNaN(bet) || bet <= 0) {
      setMessage('Bet amount must be greater than 0.');
      return;
    }
    if (bet < minBet) {
      setMessage(`Minimum bet for this machine is ${slot.minBet} ETH.`);
      return;
    }

    setSpinning(true);
    setMessage('Spinning...');

    setTimeout(() => {
      const next = Array.from({ length: 5 }, () => pickRandom(slot.symbols));
      setReels(next);

      const result = evaluateSpin(next);
      const win = Number((bet * result.multiplier).toFixed(4));

      setLastWin(win);
      setLastMultiplier(result.multiplier);
      setMessage(result.label);
      setSpinning(false);
    }, 900);
  };

  return (
    <main className="layout">
      <div className="slot-shell" style={{ '--accent': slot.accent }}>
        <p className="hero-eyebrow">{slot.subtitle}</p>
        <h1>{slot.name}</h1>

        <div className="bet-board">
          <div>
            <span>Current Bet</span>
            <strong>{Number(betAmount).toFixed(4)} ETH</strong>
          </div>
          <div>
            <span>Potential Max Win</span>
            <strong>{potentialTopWin} ETH</strong>
          </div>
          <div>
            <span>Last Win</span>
            <strong>{lastWin.toFixed(4)} ETH</strong>
          </div>
          <div>
            <span>Last Multiplier</span>
            <strong>{lastMultiplier > 0 ? `${lastMultiplier}x` : '-'}</strong>
          </div>
        </div>

        <label className="bet-input">
          Bet Amount (ETH)
          <input
            type="number"
            min={slot.minBet}
            step="0.0001"
            value={betAmount}
            onChange={(event) => setBetAmount(event.target.value)}
          />
        </label>

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

        <div className="payout-table tiny">
          <p><strong>Demo payout logic:</strong></p>
          <ul>
            <li>7️⃣ 7️⃣ 7️⃣ 7️⃣ 7️⃣ = 120x bet</li>
            <li>Five of a kind = 40x bet</li>
            <li>Four of a kind = 12x bet</li>
            <li>Three of a kind = 3x bet</li>
          </ul>
        </div>

        <p className="tiny">
          Demo spin is client-side only. If you want real-money settlement, have your backend/admin evaluate outcomes and
          settle player balances on-chain through the bankroll contract.
        </p>
      </div>
    </main>
  );
}
