import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Cross-table search: leads (WhatConverts), customers (SimPro), jobs (SimPro).
// Returns a unified list of search hits with a label, subtitle, and link target.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json({ success: true, results: [] });
  }
  const like = `%${q.replace(/[%_]/g, m => '\\' + m)}%`;
  const sb = getServerSupabase();

  const [leadsRes, custRes, jobsRes] = await Promise.all([
    sb.from('wc_leads')
      .select('id, caller_name, caller_phone, caller_email, lead_source, date_created')
      .or(`caller_name.ilike.${like},caller_phone.ilike.${like},caller_email.ilike.${like}`)
      .limit(8),
    sb.from('simpro_customers')
      .select('id, company_name, given_name, family_name, email, phone, address_city')
      .or(`company_name.ilike.${like},given_name.ilike.${like},family_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(8),
    sb.from('simpro_jobs')
      .select('id, site_address, status, date_created, total_ex_tax')
      .or(`site_address.ilike.${like},status.ilike.${like}`)
      .limit(8),
  ]);

  type Hit = { id: string; label: string; sub: string; href: string };
  const results: Hit[] = [];

  for (const r of leadsRes.data ?? []) {
    results.push({
      id: `lead-${r.id}`,
      label: r.caller_name || r.caller_phone || r.caller_email || `Lead #${r.id}`,
      sub: `Lead · ${r.lead_source ?? 'unknown'} · ${r.date_created ? new Date(r.date_created).toLocaleDateString('en-NZ') : ''}`,
      href: `/?q=${encodeURIComponent(q)}`,
    });
  }
  for (const c of custRes.data ?? []) {
    const name = [c.given_name, c.family_name].filter(Boolean).join(' ') || c.company_name || `Customer #${c.id}`;
    results.push({
      id: `cust-${c.id}`,
      label: name,
      sub: `Customer · ${c.address_city ?? '—'} · ${c.email ?? c.phone ?? ''}`,
      href: `/customers?q=${encodeURIComponent(q)}`,
    });
  }
  for (const j of jobsRes.data ?? []) {
    results.push({
      id: `job-${j.id}`,
      label: `Job #${j.id}`,
      sub: `${j.site_address ?? '—'} · ${j.status ?? ''}`,
      href: `/jobs?q=${encodeURIComponent(q)}`,
    });
  }

  return NextResponse.json({ success: true, results: results.slice(0, 12) });
}
