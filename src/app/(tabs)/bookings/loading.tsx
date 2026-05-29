// Bookings tab skeleton.
export default function BookingsLoading() {
  return (
    <div className="page">
      <div className="card" style={skeletonBlock(520)} />
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
