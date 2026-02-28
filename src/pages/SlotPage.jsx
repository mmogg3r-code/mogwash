import { Link, useParams } from 'react-router-dom';

export default function SlotPage({ slots }) {
  const { slotId } = useParams();
  const slot = slots.find((item) => item.id === slotId);

  if (!slot) {
    return (
      <main className="layout">
        <h1>Machine not found</h1>
        <Link to="/">Back to lobby</Link>
      </main>
    );
  }

  return (
    <main className="layout">
      <div className="slot-shell">
        <h1>{slot.name}</h1>
        <p>{slot.theme}</p>
        <div className="reels">
          <span>🍒</span>
          <span>7️⃣</span>
          <span>💎</span>
        </div>
        <button className="spin">Spin Demo Reel</button>
        <p className="tiny">Wire the spin logic to your on-chain game mechanics or backend RNG service.</p>
        <Link to="/">Back to lobby</Link>
      </div>
    </main>
  );
}
