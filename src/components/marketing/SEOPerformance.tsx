import { fmt } from '@/lib/format';

// Stub card — full GSC integration is a separate sync source.
// Renders the same layout as the standalone reference so it slots in
// the moment GSC data arrives.
export function SEOPerformance() {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Organic search</span>
          <h3 className="card-title">SEO Performance · 30d</h3>
          <div className="card-sub">Google organic + brand</div>
        </div>
        <span className="badge amber">Pending GSC</span>
      </div>
      <div className="card-b">
        <div className="row cols-4" style={{ gap: 12, marginBottom: 18 }}>
          <SeoStat label="Impressions" value="—" />
          <SeoStat label="Clicks" value="—" />
          <SeoStat label="CTR" value="—" />
          <SeoStat label="Avg Position" value="—" />
        </div>
        <div
          style={{
            padding: '32px 20px',
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: 12,
            border: '1px dashed var(--border-2)',
            borderRadius: 8,
          }}
        >
          Connect Google Search Console to populate impressions, clicks, CTR, position,
          and top-pages-by-leads. Add <code>GSC_SERVICE_ACCOUNT</code> +{' '}
          <code>GSC_PROPERTY_URL</code> to <code>.env.local</code> and we&apos;ll wire the sync.
        </div>
      </div>
    </div>
  );
}

function SeoStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="display num" style={{ fontSize: 24 }}>
        {value}
      </div>
    </div>
  );
}
