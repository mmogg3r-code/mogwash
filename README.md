# Telegram Real-Time News (Next.js)

A full-stack **Next.js** app that connects to Telegram groups/channels and generates a live news dashboard.

## Why this structure

This project now uses a single supported framework (**Next.js**) with a standard app structure:
- frontend UI in `app/page.js`
- backend endpoints in `app/api/*`
- shared Telegram ingestion service in `lib/telegramService.js`

## Features

- Connects to Telegram via Bot API `getUpdates`
- Supports messages from `group`, `supergroup`, and `channel`
- Real-time update push with Server-Sent Events (`/api/stream`)
- News feed with source filter + keyword search
- Top sources summary

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env.local
   ```
3. Add your Telegram bot token in `.env.local`:
   ```env
   TELEGRAM_BOT_TOKEN=<your-token>
   ```

## Run

```bash
npm run dev
```

Open: `http://localhost:3000`

## API

- `GET /api/health`
- `GET /api/news?limit=80`
- `GET /api/sources`
- `GET /api/stream` (SSE)

## Telegram notes

- Create bot with [@BotFather](https://t.me/BotFather)
- Add bot to groups/channels you want to monitor
- For channels, make bot an admin so channel posts are visible

## Production notes

- Move in-memory storage to Redis/Postgres for persistence
- Consider webhooks for higher scale
- Add authentication/authorization for private dashboards
