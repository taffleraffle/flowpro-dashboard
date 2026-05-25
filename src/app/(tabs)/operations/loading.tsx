// Operations tab skeleton.
export default function OperationsLoading() {
  return (
    <div className="page">
      <div className="row kpi-strip">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="kpi" style={skeletonBlock(130)} />
        ))}
      </div>
      <div className="card" style={skeletonBlock(240)} />
      <div className="row split-2-1">
        <div className="card" style={skeletonBlock(280)} />
        <div className="card" style={skeletonBlock(280)} />
      </div>
      <div className="card" style={skeletonBlock(200)} />
      <div className="row split-3-2">
        <div className="card" style={skeletonBlock(240)} />
        <div className="card" style={skeletonBlock(240)} />
      </div>
    </div>
  );
}

function skeletonBlock(h: number): React.CSSProperties {
  return {
    height: h,
    background: 'linear-gradient(90deg, var(--surface-2) 0%, var(--bg) 50%, var(--surface-2) 100%)',
    backgroundSize: '200% 100%',
    animation: 'skeletonShimmer 1.0s ease-in-out infinite',
  };
}
