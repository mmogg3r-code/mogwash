import { NextResponse } from 'next/server';
import { getTelegramService } from '@/lib/telegramService';

export const runtime = 'nodejs';

export async function GET() {
  const telegram = getTelegramService();
  return NextResponse.json({ items: telegram.getSources() });
}
