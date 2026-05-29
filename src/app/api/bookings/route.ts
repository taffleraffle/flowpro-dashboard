import { NextResponse } from 'next/server';
import { getRecentBookings, getNewBookingsCount } from '@/lib/bookings';

export const dynamic = 'force-dynamic';

// Feed for the notifications bell + a header badge count.
export async function GET() {
  const [items, unseen] = await Promise.all([getRecentBookings(15), getNewBookingsCount()]);
  return NextResponse.json({ success: true, items, unseen });
}
