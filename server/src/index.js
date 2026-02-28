import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { TelegramNewsService } from './telegramService.js';

const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const telegram = new TelegramNewsService({
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  pollTimeoutSeconds: Number(process.env.TELEGRAM_POLL_TIMEOUT || 20),
  maxItems: Number(process.env.MAX_NEWS_ITEMS || 300)
});

telegram.on('status', (status) => {
  console.log(`[telegram] ${status.type}${status.message ? `: ${status.message}` : ''}`);
});

if (telegram.hasToken) {
  telegram.start();
} else {
  console.warn('[telegram] TELEGRAM_BOT_TOKEN is missing. Set it in server/.env to start ingestion.');
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    telegramConnected: telegram.hasToken,
    sourceCount: telegram.getSources().length,
    totalItems: telegram.getLatest(1000).length
  });
});

app.get('/api/news', (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  res.json({ items: telegram.getLatest(limit) });
});

app.get('/api/sources', (_req, res) => {
  res.json({ items: telegram.getSources() });
});

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write(`event: snapshot\ndata: ${JSON.stringify(telegram.getLatest(30))}\n\n`);

  const onNews = (item) => {
    res.write(`event: news\ndata: ${JSON.stringify(item)}\n\n`);
  };

  const onStatus = (status) => {
    res.write(`event: status\ndata: ${JSON.stringify(status)}\n\n`);
  };

  telegram.on('news', onNews);
  telegram.on('status', onStatus);

  const heartbeat = setInterval(() => {
    res.write('event: heartbeat\ndata: {}\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    telegram.off('news', onNews);
    telegram.off('status', onStatus);
  });
});

app.listen(PORT, () => {
  console.log(`Telegram news backend running on http://localhost:${PORT}`);
});
