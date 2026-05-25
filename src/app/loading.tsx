// Shown instantly when Next.js navigates between Overview/?period= URLs
// while the Server Component re-fetches. Without this users see a blank
// pause for ~1s after clicking a period tab.

export default function OverviewLoading() {
  return (
    <div className="page">
      <div className="row kpi-strip">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="kpi" style={skeletonBlock(130)} />
        ))}
      </div>
      <div className="row split-3-2">
        <div className="card" style={skeletonBlock(360)} />
        <div className="card" style={skeletonBlock(360)} />
      </div>
      <div className="row split-2-1">
        <div className="card" style={skeletonBlock(420)} />
        <div className="card" style={skeletonBlock(420)} />
      </div>
    </div>
  );
}

function skeletonBlock(h: number): React.CSSProperties {
  return {
    height: h,
    background:
      'linear-gradient(90deg, var(--surface-2) 0%, var(--bg) 50%, var(--surface-2) 100%)',
    backgroundSize: '200% 100%',
    animation: 'skeletonShimmer 1.0s ease-in-out infinite',
  };
}
