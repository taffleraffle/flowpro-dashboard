// FlowPro brand mark. The SVG includes droplet + wordmark + tagline.
// Background pill is light so the navy lettering reads cleanly on the
// dark topbar.

export function FlowproLogo({ height = 40 }: { height?: number }) {
  // Sits directly on the now-white topbar; no pill wrapper needed.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/flowpro-logo.svg"
      alt="FlowPro Plumbers & Gasfitters"
      height={height}
      style={{ height, width: 'auto', display: 'block', flexShrink: 0 }}
    />
  );
}
