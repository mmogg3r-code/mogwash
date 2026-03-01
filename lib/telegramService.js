import EventEmitter from 'node:events';

const TELEGRAM_API_URL = 'https://api.telegram.org';
const X_API_URL = 'https://api.x.com/2';

class LiveNewsService extends EventEmitter {
  constructor({
    telegramBotToken,
    telegramPollTimeoutSeconds = 20,
    telegramAllowedChannels = ['moggnews'],
    xBearerToken,
    xUserIds = [],
    xPollIntervalMs = 30000,
    maxItems = 300
  }) {
    super();
    this.telegramBotToken = telegramBotToken;
    this.telegramPollTimeoutSeconds = telegramPollTimeoutSeconds;
    this.telegramAllowedChannels = telegramAllowedChannels;
    this.xBearerToken = xBearerToken;
    this.xUserIds = xUserIds;
    this.xPollIntervalMs = xPollIntervalMs;
    this.maxItems = maxItems;

    this.running = false;
    this.telegramOffset = 0;
    this.newsItems = [];
    this.sourceStats = new Map();

    this.xLastSeenTweetByUser = new Map();
    this.xUserProfileById = new Map();
    this.xPollTimer = null;
  }

  get hasTelegramToken() {
    return Boolean(this.telegramBotToken);
  }

  get hasTelegramChannelFilter() {
    return this.telegramAllowedChannels.length > 0;
  }

  get hasXConfig() {
    return Boolean(this.xBearerToken) && this.xUserIds.length > 0;
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;

    if (this.hasTelegramToken) {
      this.emit('status', { type: 'started', provider: 'telegram' });
      this.pollTelegramLoop();

      if (this.hasTelegramChannelFilter) {
        this.emit('status', {
          type: 'info',
          provider: 'telegram',
          message: `Listening for Telegram channels: ${this.telegramAllowedChannels.join(', ')}`
        });
      }
    } else {
      this.emit('status', {
        type: 'warning',
        provider: 'telegram',
        message: 'Missing TELEGRAM_BOT_TOKEN. Telegram ingestion is disabled.'
      });
    }

    if (this.hasXConfig) {
      this.emit('status', { type: 'started', provider: 'x' });
      this.startXPolling();
    } else {
      this.emit('status', {
        type: 'warning',
        provider: 'x',
        message: 'Missing X_BEARER_TOKEN or X_USER_IDS. X ingestion is disabled.'
      });
    }
  }

  stop() {
    this.running = false;
    if (this.xPollTimer) {
      clearTimeout(this.xPollTimer);
      this.xPollTimer = null;
    }
    this.emit('status', { type: 'stopped' });
  }

  getLatest(limit = 50) {
    return this.newsItems.slice(0, Math.max(1, limit));
  }

  getSources() {
    return [...this.sourceStats.values()].sort((a, b) => b.posts - a.posts);
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

  async pollTelegramLoop() {
    while (this.running && this.hasTelegramToken) {
      try {
        const updates = await this.fetchTelegramUpdates();
        for (const update of updates) {
          this.telegramOffset = update.update_id + 1;
          const item = this.normalizeTelegramUpdate(update);
          if (!item) continue;
          this.addItem(item);
          this.emit('news', item);
        }
      } catch (error) {
        this.emit('status', { type: 'error', provider: 'telegram', message: error.message });
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  async fetchTelegramUpdates() {
    const url = `${TELEGRAM_API_URL}/bot${this.telegramBotToken}/getUpdates`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offset: this.telegramOffset,
        timeout: this.telegramPollTimeoutSeconds,
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

  normalizeTelegramUpdate(update) {
    const message =
      update.channel_post ?? update.edited_channel_post ?? update.message ?? update.edited_message;
    if (!message?.chat) return null;
    if (!['channel', 'group', 'supergroup'].includes(message.chat.type)) return null;

    const text = message.text ?? message.caption;
    if (!text) return null;

    const chatUsername = (message.chat.username ?? '').toLowerCase();
    if (this.hasTelegramChannelFilter && !this.telegramAllowedChannels.includes(chatUsername)) {
      return null;
    }

    return {
      id: `telegram:${message.chat.id}:${message.message_id}`,
      sourceId: `telegram:${message.chat.id}`,
      sourceName: message.chat.title ?? message.chat.username ?? 'Unknown Telegram source',
      sourceType: 'telegram',
      text,
      publishedAt: new Date((message.date ?? Date.now() / 1000) * 1000).toISOString(),
      provider: 'telegram'
    };
  }

  startXPolling() {
    const run = async () => {
      if (!this.running || !this.hasXConfig) {
        return;
      }

      try {
        for (const userId of this.xUserIds) {
          await this.pollXUser(userId);
        }
      } catch (error) {
        this.emit('status', { type: 'error', provider: 'x', message: error.message });
      } finally {
        this.xPollTimer = setTimeout(run, this.xPollIntervalMs);
      }
    };

    run();
  }

  async fetchX(path, searchParams = {}) {
    const url = new URL(`${X_API_URL}${path}`);
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.xBearerToken}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`X API error (${response.status}) for ${path}`);
    }

    return response.json();
  }

  async getXUserProfile(userId) {
    if (this.xUserProfileById.has(userId)) {
      return this.xUserProfileById.get(userId);
    }

    const payload = await this.fetchX(`/users/${userId}`, {
      'user.fields': 'name,username'
    });
    const profile = payload?.data ?? { id: userId, name: userId, username: userId };
    this.xUserProfileById.set(userId, profile);
    return profile;
  }

  async pollXUser(userId) {
    const params = {
      max_results: 10,
      'tweet.fields': 'created_at,text',
      exclude: 'retweets,replies'
    };

    const sinceId = this.xLastSeenTweetByUser.get(userId);
    if (sinceId) {
      params.since_id = sinceId;
    }

    const payload = await this.fetchX(`/users/${userId}/tweets`, params);
    const tweets = payload?.data ?? [];
    if (tweets.length === 0) {
      return;
    }

    const profile = await this.getXUserProfile(userId);

    const chron = [...tweets].sort((a, b) => Number(a.id) - Number(b.id));
    for (const tweet of chron) {
      const item = {
        id: `x:${tweet.id}`,
        sourceId: `x:${userId}`,
        sourceName: `@${profile.username}`,
        sourceType: 'x',
        text: tweet.text,
        publishedAt: new Date(tweet.created_at ?? Date.now()).toISOString(),
        provider: 'x',
        url: `https://x.com/${profile.username}/status/${tweet.id}`
      };
      this.addItem(item);
      this.emit('news', item);
    }

    this.xLastSeenTweetByUser.set(userId, chron[chron.length - 1].id);
  }
}

let singleton;

function parseCsvEnv(value) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getTelegramService() {
  if (!singleton) {
    singleton = new LiveNewsService({
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
      telegramPollTimeoutSeconds: Number(process.env.TELEGRAM_POLL_TIMEOUT || 20),
      telegramAllowedChannels: parseCsvEnv(process.env.TELEGRAM_CHANNEL_USERNAMES || 'moggnews').map((v) => v.toLowerCase().replace(/^@/, '')),
      xBearerToken: process.env.X_BEARER_TOKEN,
      xUserIds: parseCsvEnv(process.env.X_USER_IDS),
      xPollIntervalMs: Number(process.env.X_POLL_INTERVAL_MS || 30000),
      maxItems: Number(process.env.MAX_NEWS_ITEMS || 300)
    });

    singleton.start();
  }

  return singleton;
}
