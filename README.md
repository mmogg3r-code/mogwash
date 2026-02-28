# Telegram Real-Time News App

A full-stack Node.js app that turns Telegram groups/channels into a live news feed.

## Stack

- **Backend:** Express (Node.js 18/20/22/24 compatible)
- **Frontend:** React + Parcel
- **Transport:** Telegram Bot API polling + Server-Sent Events (SSE) to push updates in real time

## How it works

1. Create a Telegram bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. Add the bot to your target channels/groups.
   - For channels, make the bot an admin so it can receive `channel_post` updates.
3. The backend polls Telegram `getUpdates` and normalizes messages into news items.
4. The frontend listens to `/api/stream` and updates instantly as new posts arrive.

## Setup

```bash
npm install
cp server/.env.example server/.env
```

Edit `server/.env` and set:

```env
TELEGRAM_BOT_TOKEN=<your-token>
```

## Run locally

```bash
npm run dev:server
npm run dev:client
```

- Frontend (Parcel): http://localhost:5173
- Backend: http://localhost:4000

## API endpoints

- `GET /api/health`
- `GET /api/news?limit=80`
- `GET /api/sources`
- `GET /api/stream` (SSE)

## Production notes

- Move in-memory storage to Redis/PostgreSQL for persistence.
- Use Telegram webhooks behind HTTPS for better scalability.
- Add auth if this dashboard is private.
