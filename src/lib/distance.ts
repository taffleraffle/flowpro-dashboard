// Haversine great-circle distance between two lat/lng points in km.
// Used to measure how far each SimPro job site sits from the office.
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getOfficeOrigin(): { lat: number; lng: number; label: string } {
  const lat = Number(process.env.OFFICE_LAT ?? -36.6203);
  const lng = Number(process.env.OFFICE_LNG ?? 174.6707);
  const label = process.env.OFFICE_ADDRESS ?? 'Silverdale, Auckland, New Zealand';
  return { lat, lng, label };
}
