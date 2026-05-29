'use server';

// Admin action: text a customer the booking link.
// NZ-capable providers (OpenPhone has no NZ numbers, so it's not used):
//   - ClickSend  (AU/NZ-native; alphanumeric sender ID or NZ number)
//   - Twilio     (global; alphanumeric sender ID, NZ number, or Messaging Service)
// Whichever provider's credentials are present in the env is used.
// SMS_FROM = sender shown to the customer: an alphanumeric ID like "FlowPro"
// (no replies) or a dedicated NZ number (replies). Off until creds are set.
// The booking URL is fixed server-side so this can only ever send the real link.

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

async function sendViaClickSend(to: string, body: string): Promise<{ ok: boolean; message: string }> {
  const auth = Buffer.from(`${process.env.CLICKSEND_USERNAME}:${process.env.CLICKSEND_API_KEY}`).toString('base64');
  const from = process.env.SMS_FROM || 'FlowPro';
  const res = await fetch('https://rest.clicksend.com/v3/sms/send', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ source: 'flowpro-dashboard', from, to, body }] }),
    cache: 'no-store',
  });
  const j: any = await res.json().catch(() => ({}));
  const m = j?.data?.messages?.[0];
  if (res.ok && (m?.status === 'SUCCESS' || j?.response_code === 'SUCCESS')) {
    return { ok: true, message: `Booking link texted to ${to}` };
  }
  return { ok: false, message: `Couldn’t send (ClickSend: ${m?.status || j?.response_msg || res.status}).` };
}

async function sendViaTwilio(to: string, body: string): Promise<{ ok: boolean; message: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const form = new URLSearchParams({ To: to, Body: body });
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) form.set('MessagingServiceSid', process.env.TWILIO_MESSAGING_SERVICE_SID);
  else form.set('From', process.env.SMS_FROM || process.env.TWILIO_FROM || '');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    cache: 'no-store',
  });
  if (res.ok) return { ok: true, message: `Booking link texted to ${to}` };
  const t = await res.text().catch(() => '');
  return { ok: false, message: `Couldn’t send (Twilio ${res.status}): ${t.slice(0, 140)}` };
}

export async function sendBookingLink(input: { phone: string; name?: string }): Promise<{ ok: boolean; message: string }> {
  const to = normalizeNZ(input.phone);
  if (!to) return { ok: false, message: 'That doesn’t look like a valid mobile number.' };

  const name = (input.name || '').trim().split(/\s+/)[0];
  const content = `Hi${name ? ' ' + name : ''}, thanks for contacting Flow Pro & A Plumber Near Me. To get your job booked in, tap here and fill in a few quick details: ${BOOKING_URL}`;

  try {
    if (process.env.CLICKSEND_USERNAME && process.env.CLICKSEND_API_KEY) return await sendViaClickSend(to, content);
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) return await sendViaTwilio(to, content);
    return { ok: false, message: 'SMS isn’t switched on yet — connect a NZ-capable provider (ClickSend or Twilio) in the dashboard environment.' };
  } catch {
    return { ok: false, message: 'Network error while sending the text. Please try again.' };
  }
}
