import { Link } from 'react-router-dom';
import WalletPanel from '../components/WalletPanel';

export default function HomePage({ slots }) {
  return (
    <main className="layout">
      <header className="top-nav glass-panel">
        <div>
          <p className="brand-tag">Neon Reel Royale</p>
          <strong className="brand-sub">Premium Crypto Slots</strong>
        </div>
        <nav>
          <a href="#machines">Machines</a>
          <a href="#bankroll">Bankroll</a>
        </nav>
      </header>

      <section className="hero-pro glass-panel">
        <div>
          <p className="hero-eyebrow">PROFESSIONAL WEB3 CASINO EXPERIENCE</p>
          <h1>Play Modern Slots with Transparent On-Chain Bankroll Rules</h1>
          <p>
            Elegant casino lobby, machine-specific pages, and wallet-connected bankroll controls built for real deployment
            workflows.
          </p>
          <div className="hero-actions">
            <a href="#machines" className="open-link">Browse Machines</a>
            <a href="#bankroll" className="open-link">Open Bankroll Panel</a>
          </div>
        </div>
        <aside className="hero-kpis">
          <div>
            <span>Daily Volume</span>
            <strong>2,841 ETH</strong>
          </div>
          <div>
            <span>Average RTP</span>
            <strong>96.4%</strong>
          </div>
          <div>
            <span>Live Players</span>
            <strong>1,284</strong>
          </div>
        </aside>
      </section>

      <section className="jackpot-strip">
        <div>🔥 Mega Jackpot: 318.42 ETH</div>
        <div>💎 Diamond Pool: 97.14 ETH</div>
        <div>⚡ Live Tournament: 25.00 ETH Prize</div>
      </section>

      <section id="machines">
        <div className="section-title-row">
          <h2>Featured Machines</h2>
          <p className="tiny">Each machine opens on a dedicated page.</p>
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
              <div className="card-actions">
                <Link to={`/slot/${slot.id}`} className="open-link">
                  Enter Machine
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="bankroll">
        <WalletPanel />
      </section>
    </main>
  );
}
