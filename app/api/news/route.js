import { NextResponse } from 'next/server';
import { getTelegramService } from '@/lib/telegramService';

export const runtime = 'nodejs';

export async function GET(request) {
  const telegram = getTelegramService();
  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit') || 50), 200);
  return NextResponse.json({ items: telegram.getLatest(limit) });
}
