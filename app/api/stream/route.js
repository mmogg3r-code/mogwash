import { getTelegramService } from '@/lib/telegramService';

export const runtime = 'nodejs';

const encoder = new TextEncoder();

function sse(event, data) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET() {
  const telegram = getTelegramService();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(sse('snapshot', telegram.getLatest(30)));

      const onNews = (item) => controller.enqueue(sse('news', item));
      const onStatus = (status) => controller.enqueue(sse('status', status));

      telegram.on('news', onNews);
      telegram.on('status', onStatus);

      const heartbeat = setInterval(() => {
        controller.enqueue(sse('heartbeat', {}));
      }, 15000);

      this.cleanup = () => {
        clearInterval(heartbeat);
        telegram.off('news', onNews);
        telegram.off('status', onStatus);
      };
    },
    cancel() {
      if (this.cleanup) this.cleanup();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
