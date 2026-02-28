import EventEmitter from 'node:events';

const TELEGRAM_API_URL = 'https://api.telegram.org';

class TelegramNewsService extends EventEmitter {
  constructor({ botToken, pollTimeoutSeconds = 20, maxItems = 300 }) {
    super();
    this.botToken = botToken;
    this.pollTimeoutSeconds = pollTimeoutSeconds;
    this.maxItems = maxItems;
    this.running = false;
    this.offset = 0;
    this.newsItems = [];
    this.sourceStats = new Map();
  }

  get hasToken() {
    return Boolean(this.botToken);
  }

  start() {
    if (!this.hasToken || this.running) {
      return;
    }
    this.running = true;
    this.emit('status', { type: 'started' });
    this.pollLoop();
  }

  stop() {
    this.running = false;
    this.emit('status', { type: 'stopped' });
  }

  getLatest(limit = 50) {
    return this.newsItems.slice(0, Math.max(1, limit));
  }

  getSources() {
    return [...this.sourceStats.values()].sort((a, b) => b.posts - a.posts);
  }

  async pollLoop() {
    while (this.running) {
      try {
        const updates = await this.fetchUpdates();
        for (const update of updates) {
          this.offset = update.update_id + 1;
          const item = this.normalizeUpdate(update);
          if (!item) continue;
          this.addItem(item);
          this.emit('news', item);
        }
      } catch (error) {
        this.emit('status', { type: 'error', message: error.message });
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  addItem(item) {
    this.newsItems.unshift(item);
    if (this.newsItems.length > this.maxItems) {
      this.newsItems.length = this.maxItems;
    }

    const source = this.sourceStats.get(item.sourceId) ?? {
      sourceId: item.sourceId,
      sourceName: item.sourceName,
      sourceType: item.sourceType,
      posts: 0,
      lastPostAt: item.publishedAt
    };

    source.posts += 1;
    source.lastPostAt = item.publishedAt;
    this.sourceStats.set(item.sourceId, source);
  }

  async fetchUpdates() {
    const url = `${TELEGRAM_API_URL}/bot${this.botToken}/getUpdates`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offset: this.offset,
        timeout: this.pollTimeoutSeconds,
        allowed_updates: ['message', 'edited_message', 'channel_post', 'edited_channel_post']
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Telegram API error (${response.status})`);
    }

    const payload = await response.json();
    if (!payload.ok) {
      throw new Error(payload.description || 'Telegram API returned an error');
    }

    return payload.result ?? [];
  }

  normalizeUpdate(update) {
    const message =
      update.channel_post ?? update.edited_channel_post ?? update.message ?? update.edited_message;
    if (!message?.chat) return null;
    if (!['channel', 'group', 'supergroup'].includes(message.chat.type)) return null;

    const text = message.text ?? message.caption;
    if (!text) return null;

    return {
      id: `${message.chat.id}:${message.message_id}`,
      sourceId: String(message.chat.id),
      sourceName: message.chat.title ?? message.chat.username ?? 'Unknown source',
      sourceType: message.chat.type,
      text,
      publishedAt: new Date((message.date ?? Date.now() / 1000) * 1000).toISOString()
    };
  }
}

let singleton;

export function getTelegramService() {
  if (!singleton) {
    singleton = new TelegramNewsService({
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      pollTimeoutSeconds: Number(process.env.TELEGRAM_POLL_TIMEOUT || 20),
      maxItems: Number(process.env.MAX_NEWS_ITEMS || 300)
    });

    if (singleton.hasToken) {
      singleton.start();
    } else {
      singleton.emit('status', {
        type: 'warning',
        message: 'Missing TELEGRAM_BOT_TOKEN. Add it to .env.local to receive updates.'
      });
    }
  }

  return singleton;
}
