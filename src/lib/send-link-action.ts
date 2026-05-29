'use server';

// Admin action: text a customer the booking link. Uses OpenPhone.
// Off until OPENPHONE_API_KEY + OPENPHONE_FROM are set in the dashboard env.
// The booking URL is fixed server-side (never taken from the client) so this
// can only ever send the real booking link.
const BOOKING_URL = process.env.BOOKING_URL || 'https://flowpro-dashboard.onrender.com/book.html';

function normalizeNZ(raw: string): string | null {
  let s = (raw || '').replace(/[^\d+]/g, '');
  if (!s) return null;
  if (s.startsWith('+')) { /* already E.164 */ }
  else if (s.startsWith('00')) s = '+' + s.slice(2);
  else if (s.startsWith('64')) s = '+' + s;
  else if (s.startsWith('0')) s = '+64' + s.slice(1);
  else s = '+64' + s;
  return s.length >= 11 && s.length <= 14 ? s : null;
}

export async function sendBookingLink(input: { phone: string; name?: string }): Promise<{ ok: boolean; message: string }> {
  const key = process.env.OPENPHONE_API_KEY;
  const from = process.env.OPENPHONE_FROM;
  if (!key || !from) {
    return { ok: false, message: 'SMS isn’t switched on yet — add OPENPHONE_API_KEY and OPENPHONE_FROM to the dashboard environment.' };
  }
  const to = normalizeNZ(input.phone);
  if (!to) return { ok: false, message: 'That doesn’t look like a valid mobile number.' };

  const name = (input.name || '').trim().split(/\s+/)[0];
  const content = `Hi${name ? ' ' + name : ''}, thanks for contacting Flow Pro & A Plumber Near Me. To get your job booked in, tap here and fill in a few quick details: ${BOOKING_URL}`;

  try {
    const res = await fetch('https://api.openphone.com/v1/messages', {
      method: 'POST',
      headers: { Authorization: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], content }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return { ok: false, message: `Couldn’t send (${res.status}). ${t.slice(0, 160)}` };
    }
    return { ok: true, message: `Booking link texted to ${to}` };
  } catch {
    return { ok: false, message: 'Network error while sending the text. Please try again.' };
  }
}
