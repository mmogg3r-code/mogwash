import { Link } from 'react-router-dom';
import WalletPanel from '../components/WalletPanel';

export default function HomePage({ slots }) {
  return (
    <main className="layout">
      <header className="hero casino-hero">
        <p className="hero-eyebrow">WEB3 SLOT LOUNGE</p>
        <h1>Neon Reel Royale</h1>
        <p>
          A vivid casino experience inspired by classic fruit machines, with modern routing, animated reels, and
          on-chain bankroll control.
        </p>
      </header>

      <section className="jackpot-strip">
        <div>🔥 Mega Jackpot: 318.42 ETH</div>
        <div>💎 Diamond Pool: 97.14 ETH</div>
        <div>⚡ Live Players: 1,284</div>
      </section>

      <section>
        <div className="section-title-row">
          <h2>Featured Machines</h2>
          <p className="tiny">Each machine opens on its own page.</p>
        </div>

        <div className="grid">
          {slots.map((slot) => (
            <article key={slot.id} className="card" style={{ '--accent': slot.accent }}>
              <div className="card-top">
                <h3>{slot.name}</h3>
                <span>{slot.rtp} RTP</span>
              </div>
              <p>{slot.subtitle}</p>
              <div className="chip-row">
                <small>Volatility: {slot.volatility}</small>
                <small>Min Bet: {slot.minBet} ETH</small>
                <small>Max Win: {slot.maxWin}</small>
              </div>
              <div className="symbol-row">
                {slot.symbols.slice(0, 5).map((symbol) => (
                  <span key={`${slot.id}-${symbol}`}>{symbol}</span>
                ))}
              </div>
              <Link to={`/slot/${slot.id}`} className="open-link">
                Open machine
              </Link>
            </article>
          ))}
        </div>
      </section>

      <WalletPanel />
    </main>
  );
}
