import { getTelegramService } from '@/lib/telegramService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const encoder = new TextEncoder();

function sse(event, data) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET() {
  const telegram = getTelegramService();
  let cleanup = () => {};

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

      cleanup = () => {
        clearInterval(heartbeat);
        telegram.off('news', onNews);
        telegram.off('status', onStatus);
      };
    },
    cancel() {
      cleanup();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
