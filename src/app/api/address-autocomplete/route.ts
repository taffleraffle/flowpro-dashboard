import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ~200km bounding box around Auckland CBD (-36.8485, 174.7633).
// Covers Northland down through Waikato / Bay of Plenty edges.
const BOX = { lowLat: -38.65, lowLng: 172.51, highLat: -35.05, highLng: 177.01 };

type Suggestion = { main: string; secondary: string; full: string };

// Google Places Autocomplete (New). Restricted to NZ + the Auckland box.
async function viaGoogle(q: string, key: string): Promise<Suggestion[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({
      input: q,
      includedRegionCodes: ['nz'],
      locationRestriction: {
        rectangle: {
          low: { latitude: BOX.lowLat, longitude: BOX.lowLng },
          high: { latitude: BOX.highLat, longitude: BOX.highLng },
        },
      },
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`places ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as any;
  return (j.suggestions ?? [])
    .map((s: any): Suggestion => {
      const p = s.placePrediction;
      return {
        main: p?.structuredFormat?.mainText?.text ?? p?.text?.text ?? '',
        secondary: p?.structuredFormat?.secondaryText?.text ?? '',
        full: p?.text?.text ?? '',
      };
    })
    .filter((x: Suggestion) => x.full);
}

// OpenStreetMap Nominatim — free, no key. Used until a Google key is added.
async function viaOSM(q: string): Promise<Suggestion[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', 'nz');
  url.searchParams.set('limit', '6');
  // viewbox = left(minLng),top(maxLat),right(maxLng),bottom(minLat)
  url.searchParams.set('viewbox', `${BOX.lowLng},${BOX.highLat},${BOX.highLng},${BOX.lowLat}`);
  url.searchParams.set('bounded', '1');
  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'FlowPro-Booking/1.0 (plumbing@flowpro.co.nz)',
      'Accept-Language': 'en-NZ',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const arr = (await res.json()) as any[];
  return (arr ?? []).map((r): Suggestion => {
    const parts = String(r.display_name).split(', ');
    return {
      main: parts.slice(0, 2).join(', '),
      secondary: parts.slice(2).join(', '),
      full: String(r.display_name),
    };
  });
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 3) return NextResponse.json({ success: true, suggestions: [] });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  try {
    if (key) {
      try {
        return NextResponse.json({ success: true, source: 'google', suggestions: await viaGoogle(q, key) });
      } catch {
        // Google misconfigured / quota → don't break the form, fall through to OSM.
        return NextResponse.json({ success: true, source: 'osm-fallback', suggestions: await viaOSM(q) });
      }
    }
    return NextResponse.json({ success: true, source: 'osm', suggestions: await viaOSM(q) });
  } catch {
    // Never error the field — the form lets the user submit what they typed.
    return NextResponse.json({ success: true, source: 'none', suggestions: [] });
  }
}
