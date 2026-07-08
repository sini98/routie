type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;
const WALK_MINUTES_PER_KM = 15;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** 두 좌표 사이의 대략적인 직선거리(km)를 하버사인 공식으로 계산합니다. */
export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** 실제 길찾기 API 없이, 직선거리를 도보 기준(1km당 약 15분)으로 환산한 예상 소요 시간(분) */
export function estimateWalkMinutes(distanceKm: number): number {
  return Math.max(1, Math.round(distanceKm * WALK_MINUTES_PER_KM));
}

function formatDistanceLabel(distanceKm: number): string {
  if (distanceKm < 1) {
    return `약 ${Math.round(distanceKm * 1000)}m`;
  }
  return `약 ${distanceKm.toFixed(1)}km`;
}

/** "약 1.2km · 도보 약 18분" 형태의 이동 요약 문구. 실제 길찾기가 아닌 대략적인 추정치입니다. */
export function getTravelSummary(a: LatLng, b: LatLng): string {
  const distanceKm = haversineDistanceKm(a, b);
  const minutes = estimateWalkMinutes(distanceKm);
  return `${formatDistanceLabel(distanceKm)} · 도보 약 ${minutes}분`;
}
