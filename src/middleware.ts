import { NextRequest, NextResponse } from 'next/server';

// Host-based routing for the single flowpro-dashboard service:
//   book.flowpro.co.nz      → public booking form ONLY (no dashboard)
//   dashboard.flowpro.co.nz → the dashboard, behind HTTP Basic Auth
//   *.onrender.com (default)→ treated as dashboard host, also behind auth
const BOOKING_HOST = 'book.flowpro.co.nz';

// The only things the public booking host may reach. book.html is a
// self-contained static page that calls just these two APIs.
const BOOKING_ALLOW = ['/book.html', '/api/book', '/api/address-autocomplete'];

// Static assets (logos, favicon, etc.) — always allowed, never data.
function isAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').split(':')[0].toLowerCase();
  const { pathname } = req.nextUrl;

  // ---- Public booking host: form + its two APIs + assets, nothing else ----
  if (host === BOOKING_HOST) {
    const allowed =
      isAsset(pathname) ||
      BOOKING_ALLOW.some((p) => pathname === p || pathname.startsWith(p + '/'));
    if (allowed) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = '/book.html';
    url.search = '';
    return NextResponse.redirect(url, 307);
  }

  // ---- Dashboard hosts: HTTP Basic Auth on everything else ----
  // /api/sync authenticates itself via CRON_SECRET (Bearer in the Authorization
  // header), so it must bypass Basic Auth or the two collide.
  if (pathname.startsWith('/api/sync')) return NextResponse.next();

  const user = process.env.DASHBOARD_USER;
  const pass = process.env.DASHBOARD_PASS;
  // Fail closed: if creds aren't configured, lock the dashboard rather than
  // silently leaving it public.
  if (!user || !pass) {
    return new NextResponse('Dashboard auth not configured', { status: 503 });
  }

  const expected = 'Basic ' + btoa(`${user}:${pass}`);
  if ((req.headers.get('authorization') ?? '') !== expected) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="FlowPro Dashboard", charset="UTF-8"',
      },
    });
  }
  return NextResponse.next();
}

export const config = {
  // Run on everything except Next's build output (kept fast; assets need no auth).
  matcher: ['/((?!_next/static|_next/image).*)'],
};
