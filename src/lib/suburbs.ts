import { unstable_cache } from 'next/cache';
import { getServerSupabase } from './supabase';

// Auckland suburb directory: real lat/lng (WGS84) for each suburb + the
// great-circle distance from Silverdale depot. Used by both the suburb
// matcher (extracts suburb from site_address) and the Leaflet map widget.
//
// Silverdale depot anchor: -36.6203, 174.6707
//
// Don't add "Auckland" or "CBD" as standalone keys — those strings appear
// in hundreds of business names ("Auckland Film Studio", "IKEA NZ - Auckland
// Store") and produce false positives.
type SuburbCoord = { lat: number; lng: number; distKm: number };
const SILVERDALE = { lat: -36.6203, lng: 174.6707 };

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function suburb(lat: number, lng: number): SuburbCoord {
  return { lat, lng, distKm: Number(haversineKm({ lat, lng }, SILVERDALE).toFixed(1)) };
}

const SUBURBS: Record<string, SuburbCoord> = {
  // ===== North Shore + Hibiscus Coast =====
  Silverdale:        suburb(-36.6203, 174.6707),
  Orewa:             suburb(-36.5847, 174.6982),
  Whangaparāoa:      suburb(-36.6203, 174.7370),
  Whangaparaoa:      suburb(-36.6203, 174.7370),
  'Stanmore Bay':    suburb(-36.6275, 174.7237),
  'Red Beach':       suburb(-36.6072, 174.7027),
  Manly:             suburb(-36.6225, 174.7395),
  'Hatfields Beach': suburb(-36.5775, 174.7019),
  'Arkles Bay':      suburb(-36.6326, 174.7211),
  Wainui:            suburb(-36.6042, 174.6203),
  'Dairy Flat':      suburb(-36.6839, 174.6517),
  Albany:            suburb(-36.7256, 174.7045),
  'Long Bay':        suburb(-36.6845, 174.7466),
  Torbay:            suburb(-36.6989, 174.7470),
  'Browns Bay':      suburb(-36.7142, 174.7470),
  'Mairangi Bay':    suburb(-36.7367, 174.7501),
  'Murrays Bay':     suburb(-36.7287, 174.7494),
  'Campbells Bay':   suburb(-36.7466, 174.7510),
  Sunnynook:         suburb(-36.7575, 174.7459),
  'Forrest Hill':    suburb(-36.7700, 174.7430),
  Milford:           suburb(-36.7766, 174.7600),
  Takapuna:          suburb(-36.7867, 174.7755),
  Devonport:         suburb(-36.8311, 174.7951),
  Glenfield:         suburb(-36.7787, 174.7240),
  Northcote:         suburb(-36.8062, 174.7472),
  Birkenhead:        suburb(-36.8137, 174.7286),
  Warkworth:         suburb(-36.3978, 174.6664),
  Helensville:       suburb(-36.6766, 174.4523),

  // ===== West Auckland =====
  Riverhead:         suburb(-36.7565, 174.5947),
  Coatesville:       suburb(-36.7283, 174.6398),
  Kumeu:             suburb(-36.7717, 174.5512),
  Hobsonville:       suburb(-36.7848, 174.6608),
  'West Harbour':    suburb(-36.8156, 174.6395),
  Whenuapai:         suburb(-36.7969, 174.6322),
  Greenhithe:        suburb(-36.7723, 174.6839),
  Massey:            suburb(-36.8350, 174.6005),
  Henderson:         suburb(-36.8769, 174.6285),
  'Te Atatu':        suburb(-36.8516, 174.6555),
  'New Lynn':        suburb(-36.9119, 174.6856),
  Avondale:          suburb(-36.8949, 174.7011),
  'Glen Eden':       suburb(-36.9105, 174.6532),
  Titirangi:         suburb(-36.9333, 174.6500),
  Westmere:          suburb(-36.8669, 174.7283),
  'Pt Chevalier':    suburb(-36.8676, 174.7065),
  'Grey Lynn':       suburb(-36.8642, 174.7458),

  // ===== Central / Inner suburbs =====
  Ponsonby:          suburb(-36.8530, 174.7444),
  Parnell:           suburb(-36.8579, 174.7822),
  Newmarket:         suburb(-36.8696, 174.7782),
  'Mt Eden':         suburb(-36.8810, 174.7572),
  'Mount Eden':      suburb(-36.8810, 174.7572),
  Kingsland:         suburb(-36.8740, 174.7460),
  Morningside:       suburb(-36.8807, 174.7373),
  Epsom:             suburb(-36.8836, 174.7700),
  'Mt Albert':       suburb(-36.8862, 174.7197),
  'Mount Albert':    suburb(-36.8862, 174.7197),
  Remuera:           suburb(-36.8800, 174.7967),
  Ellerslie:         suburb(-36.8989, 174.8056),
  Greenlane:         suburb(-36.8852, 174.7889),
  'One Tree Hill':   suburb(-36.9000, 174.7872),
  Onehunga:          suburb(-36.9249, 174.7864),
  'Royal Oak':       suburb(-36.9120, 174.7785),
  'Mt Roskill':      suburb(-36.9000, 174.7340),
  'Mount Roskill':   suburb(-36.9000, 174.7340),
  Hillsborough:      suburb(-36.9325, 174.7458),

  // ===== South Auckland =====
  Penrose:           suburb(-36.9166, 174.8166),
  'Mt Wellington':   suburb(-36.9023, 174.8389),
  'Mount Wellington':suburb(-36.9023, 174.8389),
  'Sylvia Park':     suburb(-36.9145, 174.8395),
  Otahuhu:           suburb(-36.9444, 174.8327),
  Mangere:           suburb(-36.9656, 174.7894),
  Papatoetoe:        suburb(-36.9737, 174.8487),
  Manurewa:          suburb(-37.0249, 174.8985),
  Takanini:          suburb(-37.0432, 174.9106),
  Papakura:          suburb(-37.0653, 174.9442),
  'Flat Bush':       suburb(-36.9583, 174.8961),

  // ===== East Auckland =====
  Pakuranga:         suburb(-36.9043, 174.8910),
  Howick:            suburb(-36.8943, 174.9242),
  Botany:            suburb(-36.9303, 174.9082),
  'Half Moon Bay':   suburb(-36.8800, 174.9000),
};

export type SuburbRow = {
  name: string;
  lat: number;
  lng: number;
  distKm: number;
  jobs: number;
  revenue: number;
  avgTicket: number | null;
  topType: string | null;        // most common status/type at this suburb
  topTypeShare: number | null;   // 0-1, % of jobs that are the top type
  typeBreakdown: { type: string; count: number; revenue: number }[]; // top 5
  lastJobDate: string | null;    // ISO date — most recent job
  firstJobDate: string | null;   // ISO date — oldest job (tenure)
  recentJobs: number;            // jobs completed in last 90 days
  recentRevenue: number;         // revenue from last 90 days
  primary?: boolean;
};

// Match a free-text site address against the suburb list.
// Returns the longest matching suburb name (so "Stanmore Bay" wins over "Bay").
function matchSuburb(addr: string): string | null {
  if (!addr) return null;
  const lower = addr.toLowerCase();
  let best: { name: string; len: number } | null = null;
  for (const name of Object.keys(SUBURBS)) {
    if (lower.includes(name.toLowerCase())) {
      if (!best || name.length > best.len) best = { name, len: name.length };
    }
  }
  return best?.name ?? null;
}

export const getSuburbDistribution = unstable_cache(
  async (): Promise<SuburbRow[]> => {
    const sb = getServerSupabase();
    const PAGE = 1000;
    type Bucket = {
      jobs: number;
      revenue: number;
      types: Map<string, { count: number; revenue: number }>;
      lastJobDate: string | null;
      firstJobDate: string | null;
      recentJobs: number;
      recentRevenue: number;
    };
    const buckets = new Map<string, Bucket>();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    for (let from = 0; from < 30_000; from += PAGE) {
      const { data, error } = await sb
        .from('simpro_jobs')
        .select('site_address, total_ex_tax, date_completed, raw')
        .eq('is_complete', true)
        .range(from, from + PAGE - 1);
      if (error) break; // table missing or query failed — return whatever we have
      const rows = data ?? [];
      for (const r of rows) {
        const matched = matchSuburb(r.site_address ?? '');
        if (!matched) continue;
        const canonical =
          matched === 'Whangaparaoa' ? 'Whangaparāoa' :
          matched === 'Mount Eden'   ? 'Mt Eden' :
          matched === 'Mount Albert' ? 'Mt Albert' :
          matched === 'Mount Roskill' ? 'Mt Roskill' :
          matched === 'Mount Wellington' ? 'Mt Wellington' :
          matched;
        const b = buckets.get(canonical) ?? {
          jobs: 0,
          revenue: 0,
          types: new Map<string, { count: number; revenue: number }>(),
          lastJobDate: null,
          firstJobDate: null,
          recentJobs: 0,
          recentRevenue: 0,
        };
        const rev = Number(r.total_ex_tax ?? 0);
        b.jobs += 1;
        b.revenue += rev;

        // Job type from SimPro raw payload — "Service" (one-off jobs) vs
        // "Project" (multi-stage builds). Coarse but real categorisation.
        const rawType =
          r.raw && typeof r.raw === 'object' && 'Type' in r.raw && typeof (r.raw as Record<string, unknown>).Type === 'string'
            ? ((r.raw as Record<string, unknown>).Type as string).trim()
            : '';
        const type = rawType || 'Other';
        const t = b.types.get(type) ?? { count: 0, revenue: 0 };
        t.count += 1;
        t.revenue += rev;
        b.types.set(type, t);

        // Date range
        if (r.date_completed) {
          const d = r.date_completed.slice(0, 10);
          if (!b.lastJobDate || d > b.lastJobDate) b.lastJobDate = d;
          if (!b.firstJobDate || d < b.firstJobDate) b.firstJobDate = d;
          if (d >= ninetyDaysAgo) {
            b.recentJobs += 1;
            b.recentRevenue += rev;
          }
        }

        buckets.set(canonical, b);
      }
      if (rows.length < PAGE) break;
    }

    return [...buckets.entries()]
      .map(([name, b]) => {
        const breakdown = [...b.types.entries()]
          .map(([type, t]) => ({ type, count: t.count, revenue: t.revenue }))
          .sort((a, b) => b.count - a.count);
        const top = breakdown[0];
        return {
          name,
          ...SUBURBS[name],
          jobs: b.jobs,
          revenue: b.revenue,
          avgTicket: b.jobs > 0 ? b.revenue / b.jobs : null,
          topType: top?.type ?? null,
          topTypeShare: top && b.jobs > 0 ? top.count / b.jobs : null,
          typeBreakdown: breakdown.slice(0, 5),
          lastJobDate: b.lastJobDate,
          firstJobDate: b.firstJobDate,
          recentJobs: b.recentJobs,
          recentRevenue: b.recentRevenue,
          primary: name === 'Silverdale',
        };
      })
      .sort((a, b) => b.jobs - a.jobs);
  },
  ['suburb-distribution-v4-type'],
  { revalidate: 300, tags: ['dashboard'] },
);

export const SILVERDALE_DEPOT = SILVERDALE;
