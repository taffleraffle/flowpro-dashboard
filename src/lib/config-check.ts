// Detects missing env vars BEFORE we try to call Supabase / SimPro / WhatConverts.
// Lets the dashboard render a friendly setup screen instead of a stack trace
// when someone boots the project before pasting credentials.

export type ConfigCheckGroup = {
  label: string;
  required: boolean;
  vars: { name: string; present: boolean; hint: string }[];
};

export function getConfigStatus(): { ok: boolean; groups: ConfigCheckGroup[] } {
  const has = (k: string) => Boolean(process.env[k] && process.env[k]!.trim().length > 0);

  const groups: ConfigCheckGroup[] = [
    {
      label: 'Supabase (required to boot)',
      required: true,
      vars: [
        { name: 'NEXT_PUBLIC_SUPABASE_URL', present: has('NEXT_PUBLIC_SUPABASE_URL'), hint: 'Supabase → Project Settings → API → Project URL' },
        { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', present: has('NEXT_PUBLIC_SUPABASE_ANON_KEY'), hint: 'Supabase → Project Settings → API → anon public' },
        { name: 'SUPABASE_SERVICE_ROLE_KEY', present: has('SUPABASE_SERVICE_ROLE_KEY'), hint: 'Supabase → Project Settings → API → service_role (secret!)' },
      ],
    },
    {
      label: 'SimPro',
      required: false,
      vars: [
        { name: 'SIMPRO_TENANT', present: has('SIMPRO_TENANT'), hint: 'Subdomain only, e.g. "optdigital"' },
        { name: 'SIMPRO_ACCESS_TOKEN', present: has('SIMPRO_ACCESS_TOKEN'), hint: 'Already provided in brief' },
        { name: 'SIMPRO_COMPANY_ID', present: has('SIMPRO_COMPANY_ID'), hint: 'Usually 0' },
      ],
    },
    {
      label: 'WhatConverts',
      required: false,
      vars: [
        { name: 'WC_API_TOKEN', present: has('WC_API_TOKEN'), hint: 'Already provided in brief' },
        { name: 'WC_API_SECRET', present: has('WC_API_SECRET'), hint: 'WhatConverts → Settings → Integrations → API' },
        { name: 'WC_PROFILE_IDS', present: has('WC_PROFILE_IDS'), hint: 'Comma-separated: FlowPro + A Plumber Near Me' },
      ],
    },
    {
      label: 'Google Ads (stub — for later)',
      required: false,
      vars: [
        { name: 'GOOGLE_ADS_CUSTOMER_ID', present: has('GOOGLE_ADS_CUSTOMER_ID'), hint: 'Stubbed' },
      ],
    },
    {
      label: 'Meta Ads (stub — for later)',
      required: false,
      vars: [
        { name: 'META_AD_ACCOUNT_ID', present: has('META_AD_ACCOUNT_ID'), hint: 'Stubbed' },
        { name: 'META_ACCESS_TOKEN', present: has('META_ACCESS_TOKEN'), hint: 'Stubbed' },
      ],
    },
  ];

  const ok = groups
    .filter(g => g.required)
    .every(g => g.vars.every(v => v.present));

  return { ok, groups };
}
