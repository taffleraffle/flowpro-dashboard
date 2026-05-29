import { getServerSupabase } from './supabase';

export type BookingStatus = 'new' | 'sent_to_simpro' | 'error';

export type BookingRow = {
  id: string;
  ref: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  service: string | null;
  urgency: string | null;
  owner_or_tenant: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  description: string | null;
  photo_urls: string[];
  status: BookingStatus;
  simpro_customer_id: number | null;
  simpro_site_id: number | null;
  simpro_lead_id: number | null;
  simpro_error: string | null;
  seen: boolean;
  created_at: string;
};

// Reads are defensive: if the bookings table doesn't exist yet (migration not
// applied), return empty rather than crashing the dashboard.
export async function getRecentBookings(limit = 100): Promise<BookingRow[]> {
  try {
    const sb = getServerSupabase();
    const { data, error } = await sb
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as BookingRow[];
  } catch {
    return [];
  }
}

export async function getNewBookingsCount(): Promise<number> {
  try {
    const sb = getServerSupabase();
    const { count, error } = await sb
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('seen', false);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
