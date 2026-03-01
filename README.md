# Telegram + X Real-Time News (Next.js)

A full-stack **Next.js** app that aggregates live posts from Telegram and selected X accounts into one real-time website feed.

## Features

- Auto-ingests new posts from Telegram channel **@moggnews** by default
- Supports filtering Telegram ingestion to specific channel usernames
- X ingestion via X API v2 (`/2/users/:id/tweets`)
- Combined live feed with source filters + search
- Real-time push to browser via Server-Sent Events (`/api/stream`)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env.local
   ```
3. Set credentials in `.env.local`:
   ```env
   TELEGRAM_BOT_TOKEN=<telegram-bot-token>
   TELEGRAM_CHANNEL_USERNAMES=moggnews
   X_BEARER_TOKEN=<x-api-bearer-token>
   X_USER_IDS=<comma-separated-x-user-ids>
   ```

## Important: @moggnews auto-feed

This app is configured to ingest `@moggnews` by default via:

```env
TELEGRAM_CHANNEL_USERNAMES=moggnews
```

To make new channel posts appear automatically on the website feed:

1. Add your Telegram bot to `@moggnews`
2. Give it permission/admin rights to read channel posts
3. Ensure `TELEGRAM_BOT_TOKEN` is valid
4. Start the app and keep it running (`npm run dev`)

Every new channel post received by the bot will be pushed to `/api/stream` and shown in the live feed.

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

## Notes

- This prototype uses in-memory storage; use Redis/Postgres for persistence in production.
- Ensure your X developer app has API v2 read access for tracked accounts.
