'use client';

// Global error boundary. Without this, Next.js falls back to its
// generic "Application error: a server-side exception has occurred"
// page that only shows an opaque digest — useless for diagnosis,
// especially on Render where we can't tail the server logs from
// outside the dashboard.
//
// Surfaces the actual error message + stack + digest so the issue
// is visible in-browser. Keep this in until we have a stable build.

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to server console too (visible in Render logs).
    // eslint-disable-next-line no-console
    console.error('[GlobalError]', error.digest, error.message, error.stack);
  }, [error]);

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: 820,
      margin: '60px auto',
      padding: 24,
      lineHeight: 1.55,
      color: '#1a1a1a',
    }}>
      <div style={{
        background: '#fff5f5',
        border: '1px solid #fecaca',
        borderRadius: 12,
        padding: 20,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Server error
        </div>
        <h1 style={{ fontSize: 22, margin: '0 0 12px', fontWeight: 600 }}>
          The dashboard couldn't render.
        </h1>
        <div style={{
          marginTop: 8,
          fontSize: 13,
          color: '#7f1d1d',
          fontFamily: 'ui-monospace, Menlo, monospace',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          padding: '10px 12px',
          borderRadius: 8,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          <strong>{error.name || 'Error'}:</strong> {error.message || '(no message)'}
        </div>
        {error.digest ? (
          <div style={{ marginTop: 8, fontSize: 12, color: '#7f1d1d' }}>
            Digest: <code>{error.digest}</code>
          </div>
        ) : null}
        <details style={{ marginTop: 14 }}>
          <summary style={{ fontSize: 13, color: '#7f1d1d', cursor: 'pointer' }}>Stack trace</summary>
          <pre style={{
            marginTop: 8,
            fontSize: 11,
            color: '#7f1d1d',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            padding: 10,
            borderRadius: 6,
            overflow: 'auto',
            maxHeight: 320,
          }}>{error.stack || '(no stack)'}</pre>
        </details>
        <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
          <button onClick={() => reset()} style={{
            padding: '8px 14px',
            background: '#dc2626', color: '#fff',
            border: 0, borderRadius: 6,
            fontSize: 13, fontWeight: 500,
            cursor: 'pointer',
          }}>
            Try again
          </button>
          <a href="/api/diag" style={{
            padding: '8px 14px',
            background: '#fff', color: '#1a1a1a',
            border: '1px solid #d4d4d8', borderRadius: 6,
            fontSize: 13, fontWeight: 500,
            textDecoration: 'none',
          }}>
            Run diagnostics →
          </a>
        </div>
      </div>
      <div style={{ marginTop: 16, fontSize: 12, color: '#6b7280' }}>
        Hit <code>/api/diag</code> for a per-function breakdown of which Supabase query
        failed and whether each env var is present on the server.
      </div>
    </div>
  );
}
