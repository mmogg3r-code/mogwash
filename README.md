# Telegram + X Real-Time News (Next.js)

A full-stack **Next.js** app that aggregates live posts from Telegram groups/channels and selected X accounts into one real-time news dashboard.

## Features

- Telegram ingestion via Bot API `getUpdates`
- X ingestion via X API v2 (`/2/users/:id/tweets`)
- Combined live feed with source filters + search
- Real-time push to browser via Server-Sent Events (`/api/stream`)
- Source leaderboard across Telegram and X

## Project structure

- Frontend UI: `app/page.js`
- API routes: `app/api/*`
- Shared ingestion logic: `lib/telegramService.js`

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
   X_BEARER_TOKEN=<x-api-bearer-token>
   X_USER_IDS=<comma-separated-x-user-ids>
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

## How to monitor specific X channels

Set `X_USER_IDS` to the numeric user IDs of the accounts you want to track.
Example:

```env
X_USER_IDS=44196397,783214
```

(Example IDs above correspond to known accounts and can be replaced with your target accounts.)

## Notes

- This is a prototype using in-memory storage. For production, persist to Redis/Postgres.
- Ensure your X developer app has access to read tweets for API v2.
