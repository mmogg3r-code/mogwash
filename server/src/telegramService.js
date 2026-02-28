import EventEmitter from 'node:events';

const TELEGRAM_API_URL = 'https://api.telegram.org';

export class TelegramNewsService extends EventEmitter {
  constructor({ botToken, pollTimeoutSeconds = 20, maxItems = 200 }) {
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

  async start() {
    if (!this.hasToken || this.running) {
      return;
    }

    this.running = true;
    this.emit('status', { type: 'started' });

    while (this.running) {
      try {
        const updates = await this.fetchUpdates();
        for (const update of updates) {
          this.offset = update.update_id + 1;
          const normalized = this.normalizeUpdate(update);
          if (!normalized) {
            continue;
          }
          this.addItem(normalized);
          this.emit('news', normalized);
        }
      } catch (error) {
        this.emit('status', {
          type: 'error',
          message: error.message
        });
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  stop() {
    this.running = false;
    this.emit('status', { type: 'stopped' });
  }

  getLatest(limit = 50) {
    return this.newsItems.slice(0, limit);
  }

  getSources() {
    return [...this.sourceStats.values()].sort((a, b) => b.posts - a.posts);
  }

  addItem(item) {
    this.newsItems.unshift(item);
    if (this.newsItems.length > this.maxItems) {
      this.newsItems.length = this.maxItems;
    }

    const current = this.sourceStats.get(item.sourceId) ?? {
      sourceId: item.sourceId,
      sourceName: item.sourceName,
      sourceType: item.sourceType,
      posts: 0,
      lastPostAt: item.publishedAt
    };

    current.posts += 1;
    current.lastPostAt = item.publishedAt;
    this.sourceStats.set(item.sourceId, current);
  }

  async fetchUpdates() {
    const url = `${TELEGRAM_API_URL}/bot${this.botToken}/getUpdates`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        offset: this.offset,
        timeout: this.pollTimeoutSeconds,
        allowed_updates: ['message', 'edited_message', 'channel_post', 'edited_channel_post']
      })
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    const payload = await response.json();
    if (!payload.ok) {
      throw new Error(payload.description || 'Telegram API returned an unknown error');
    }

    return payload.result ?? [];
  }

  normalizeUpdate(update) {
    const message =
      update.channel_post ??
      update.edited_channel_post ??
      update.message ??
      update.edited_message;

    if (!message?.chat) {
      return null;
    }

    if (!['channel', 'supergroup', 'group'].includes(message.chat.type)) {
      return null;
    }

    const text = message.text ?? message.caption;
    if (!text) {
      return null;
    }

    return {
      id: `${message.chat.id}:${message.message_id}`,
      sourceId: String(message.chat.id),
      sourceName: message.chat.title ?? message.chat.username ?? 'Unknown source',
      sourceType: message.chat.type,
      text,
      publishedAt: new Date((message.date ?? Date.now() / 1000) * 1000).toISOString(),
      link: message.link ?? null,
      rawType: update.channel_post ? 'channel_post' : 'message'
    };
  }
}
