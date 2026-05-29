import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabase } from '@/lib/supabase';
import { createBookingInSimpro } from '@/lib/simpro';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // SimPro does 3 sequential creates + photo uploads

// Public endpoint — anyone with the /book.html link can POST. Protected by
// strict validation + a honeypot field, not auth. Inserts via service-role.
const PhotoSchema = z.object({
  dataUrl: z.string().regex(/^data:image\/[a-zA-Z+]+;base64,/),
});
const BookingSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(6).max(40),
  address: z.string().trim().min(3).max(300),
  service: z.string().trim().max(60).optional(),
  urgency: z.string().trim().max(60).optional(),
  owner_or_tenant: z.string().trim().max(20).optional(),
  preferred_date: z.string().trim().max(20).optional(),
  preferred_time: z.string().trim().max(30).optional(),
  description: z.string().trim().max(4000).optional(),
  photos: z.array(PhotoSchema).max(6).optional(),
  company: z.string().optional(), // honeypot — real users never fill this
});

function makeRef(): string {
  return 'FP-' + Math.floor(10000 + Math.random() * 89999);
}

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const parsed = BookingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Please check your details and try again.' },
      { status: 400 },
    );
  }
  const b = parsed.data;

  // Honeypot tripped → silently accept (don't tip off bots) but store nothing.
  if (b.company && b.company.trim() !== '') {
    return NextResponse.json({ success: true, data: { ref: makeRef() } });
  }

  const supabase = getServerSupabase();
  const ref = makeRef();

  // Decode photos once: store in the public bucket (dashboard thumbnails) AND
  // keep the base64 to attach to the SimPro lead's Attachments tab.
  const photoUrls: string[] = [];
  const attachments: { filename: string; base64: string }[] = [];
  for (let i = 0; i < (b.photos?.length ?? 0); i++) {
    try {
      const m = b.photos![i].dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!m) continue;
      const contentType = m[1];
      const ext = contentType.split('/')[1].replace('jpeg', 'jpg').replace('+xml', '');
      const base64 = m[2];
      attachments.push({ filename: `${ref}-photo-${i + 1}.${ext}`, base64 });
      const buf = Buffer.from(base64, 'base64');
      const path = `${ref}/${i + 1}.${ext}`;
      const { error } = await supabase.storage
        .from('booking-photos')
        .upload(path, buf, { contentType, upsert: true });
      if (!error) {
        const { data } = supabase.storage.from('booking-photos').getPublicUrl(path);
        if (data?.publicUrl) photoUrls.push(data.publicUrl);
      }
    } catch {
      // a failed photo never blocks the booking
    }
  }

  // 1) Persist the booking first so it's never lost, even if SimPro is down.
  const { data: inserted, error: insErr } = await supabase
    .from('bookings')
    .insert({
      ref,
      name: b.name,
      email: b.email,
      phone: b.phone,
      address: b.address,
      service: b.service ?? null,
      urgency: b.urgency ?? null,
      owner_or_tenant: b.owner_or_tenant ?? null,
      preferred_date: b.preferred_date ?? null,
      preferred_time: b.preferred_time ?? null,
      description: b.description ?? null,
      photo_urls: photoUrls,
      status: 'new',
      raw: { service: b.service, urgency: b.urgency, photo_count: b.photos?.length ?? 0 },
    })
    .select('id, ref')
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      { success: false, error: 'Something went wrong saving your booking. Please call us.' },
      { status: 500 },
    );
  }

  // 2) Push to SimPro (Customer -> Site -> Lead). If it fails, the booking is
  // still saved and surfaces in the dashboard with status 'error' for the team.
  try {
    const ids = await createBookingInSimpro({
      name: b.name,
      email: b.email,
      phone: b.phone,
      address: b.address,
      service: b.service,
      urgency: b.urgency,
      ownerOrTenant: b.owner_or_tenant,
      preferredDate: b.preferred_date,
      preferredTime: b.preferred_time,
      description: b.description,
      photoUrls,
      attachments,
    });
    await supabase
      .from('bookings')
      .update({
        status: 'sent_to_simpro',
        simpro_customer_id: ids.customerId,
        simpro_site_id: ids.siteId,
        simpro_lead_id: ids.leadId,
      })
      .eq('id', inserted.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from('bookings')
      .update({ status: 'error', simpro_error: message.slice(0, 500) })
      .eq('id', inserted.id);
    // Customer's booking is received (team is notified in the dashboard); the
    // SimPro push just needs a retry. Don't fail the customer's submission.
  }

  return NextResponse.json({ success: true, data: { ref } });
}
