import { NextResponse } from 'next/server';
import { getRecentSyncRuns } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

// Lightweight feed of recent sync runs for the bell dropdown + Settings drawer.
export async function GET() {
  const items = await getRecentSyncRuns(20);
  return NextResponse.json({ success: true, items });
}
