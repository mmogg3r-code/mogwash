import { NextResponse } from 'next/server';
import { getTelegramService } from '@/lib/telegramService';

export const runtime = 'nodejs';

export async function GET() {
  const liveNews = getTelegramService();
  return NextResponse.json({
    status: 'ok',
    telegramConnected: liveNews.hasTelegramToken,
    xConnected: liveNews.hasXConfig,
    sourceCount: liveNews.getSources().length,
    totalItems: liveNews.getLatest(1000).length
  });
}
