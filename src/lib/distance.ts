type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;
const WALK_MINUTES_PER_KM = 15;
// 실제 도로 주행이 아닌 직선거리 기준 추정치라, 시내/고속도로가 섞인 평균 주행 속도로
// 대략만 환산합니다(도보 추정치와 같은 방식 — 실제 길찾기 API를 쓰지 않습니다).
const DRIVE_KM_PER_HOUR = 75;

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

/** 직선거리를 차량 평균 속도(시속 75km) 기준으로 환산한 예상 소요 시간(분) */
export function estimateDriveMinutes(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / DRIVE_KM_PER_HOUR) * 60));
}

function formatDistanceLabel(distanceKm: number): string {
  if (distanceKm < 1) {
    return `약 ${Math.round(distanceKm * 1000)}m`;
  }
  return `약 ${distanceKm.toFixed(1)}km`;
}

/** 분 단위 시간을 "약 4시간 10분"/"약 45분" 형태로 표시합니다(60분 미만이면 시간 단위 생략). */
function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `약 ${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining === 0 ? `약 ${hours}시간` : `약 ${hours}시간 ${remaining}분`;
}

/** "약 1.2km · 도보 약 18분 · 차량 약 3분" 형태의 이동 요약 문구. 60분이 넘으면 도보/차량
 * 모두 "N시간 M분"으로 자동 변환됩니다. 실제 길찾기가 아닌 대략적인 추정치입니다. */
export function getTravelSummary(a: LatLng, b: LatLng): string {
  const distanceKm = haversineDistanceKm(a, b);
  const walkMinutes = estimateWalkMinutes(distanceKm);
  const driveMinutes = estimateDriveMinutes(distanceKm);
  return `${formatDistanceLabel(distanceKm)} · 도보 ${formatDurationLabel(walkMinutes)} · 차량 ${formatDurationLabel(driveMinutes)}`;
}
