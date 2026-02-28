import { Link } from 'react-router-dom';
import WalletPanel from '../components/WalletPanel';

export default function HomePage({ slots }) {
  return (
    <main className="layout">
      <header className="hero">
        <h1>Neon Reel Casino</h1>
        <p>Modern multi-slot Web3 casino lobby with dedicated game pages.</p>
      </header>

      <section>
        <h2>Featured Machines</h2>
        <div className="grid">
          {slots.map((slot) => (
            <article key={slot.id} className="card">
              <h3>{slot.name}</h3>
              <p>{slot.theme}</p>
              <small>Volatility: {slot.volatility}</small>
              <Link to={`/slot/${slot.id}`}>Open machine</Link>
            </article>
          ))}
        </div>
      </section>

      <WalletPanel />
    </main>
  );
}
