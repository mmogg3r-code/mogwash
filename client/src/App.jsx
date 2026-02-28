import { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(date));
}

export function App() {
  const [items, setItems] = useState([]);
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState('all');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    fetch(`${API_BASE}/api/news?limit=80`)
      .then((res) => res.json())
      .then((payload) => setItems(payload.items ?? []))
      .catch(() => setStatus('Failed to load initial news'));

    fetch(`${API_BASE}/api/sources`)
      .then((res) => res.json())
      .then((payload) => setSources(payload.items ?? []))
      .catch(() => {});

    const events = new EventSource(`${API_BASE}/api/stream`);

    events.addEventListener('snapshot', (event) => {
      const snapshot = JSON.parse(event.data);
      setItems(snapshot);
      setStatus('Live');
    });

    events.addEventListener('news', (event) => {
      const incoming = JSON.parse(event.data);
      setItems((current) => {
        const next = [incoming, ...current.filter((item) => item.id !== incoming.id)];
        return next.slice(0, 200);
      });
      setSources((current) => {
        const found = current.find((source) => source.sourceId === incoming.sourceId);
        if (!found) {
          return [
            {
              sourceId: incoming.sourceId,
              sourceName: incoming.sourceName,
              sourceType: incoming.sourceType,
              posts: 1,
              lastPostAt: incoming.publishedAt
            },
            ...current
          ];
        }

        return current
          .map((source) =>
            source.sourceId === incoming.sourceId
              ? {
                  ...source,
                  posts: source.posts + 1,
                  lastPostAt: incoming.publishedAt
                }
              : source
          )
          .sort((a, b) => b.posts - a.posts);
      });
    });

    events.addEventListener('status', (event) => {
      const nextStatus = JSON.parse(event.data);
      if (nextStatus.type === 'error') {
        setStatus(`Telegram error: ${nextStatus.message}`);
      }
    });

    events.onerror = () => setStatus('Disconnected. Retrying...');

    return () => events.close();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchSource = selectedSource === 'all' || item.sourceId === selectedSource;
      const matchQuery = item.text.toLowerCase().includes(query.toLowerCase());
      return matchSource && matchQuery;
    });
  }, [items, selectedSource, query]);

  return (
    <main className="container">
      <header>
        <h1>Telegram Real-Time News Desk</h1>
        <p>
          Track updates from Telegram groups and channels as soon as they are posted, then filter by source
          or keyword.
        </p>
        <span className="status">Status: {status}</span>
      </header>

      <section className="filters">
        <label>
          Source
          <select value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)}>
            <option value="all">All sources</option>
            {sources.map((source) => (
              <option key={source.sourceId} value={source.sourceId}>
                {source.sourceName} ({source.posts})
              </option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input
            type="search"
            value={query}
            placeholder="Search text..."
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </section>

      <section className="grid">
        <aside className="sources">
          <h2>Top Sources</h2>
          <ul>
            {sources.slice(0, 12).map((source) => (
              <li key={source.sourceId}>
                <strong>{source.sourceName}</strong>
                <small>
                  {source.sourceType} · {source.posts} posts
                </small>
              </li>
            ))}
          </ul>
        </aside>

        <section className="feed">
          <h2>Live Feed ({filtered.length})</h2>
          {filtered.length === 0 ? <p>No Telegram messages yet. Add your bot to groups/channels.</p> : null}
          <ul>
            {filtered.map((item) => (
              <li key={item.id}>
                <div className="item-meta">
                  <strong>{item.sourceName}</strong>
                  <time>{formatDate(item.publishedAt)}</time>
                </div>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
