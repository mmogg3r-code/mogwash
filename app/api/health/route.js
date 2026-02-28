import { NextResponse } from 'next/server';
import { getTelegramService } from '@/lib/telegramService';

export const runtime = 'nodejs';

export async function GET() {
  const telegram = getTelegramService();
  return NextResponse.json({
    status: 'ok',
    telegramConnected: telegram.hasToken,
    sourceCount: telegram.getSources().length,
    totalItems: telegram.getLatest(1000).length
  });
}
