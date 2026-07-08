export type MockBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

/** 지도 API가 없을 때 보여줄 기본 범위(서울 권역, 실제 지도가 아닌 근사치입니다). */
export const DEFAULT_MOCK_BOUNDS: MockBounds = {
  minLat: 37.49,
  maxLat: 37.58,
  minLng: 127.0,
  maxLng: 127.15,
};

/** Mock Map 안에서 클릭한 위치의 비율(0~1)을 bounds 기준 좌표로 변환합니다. */
export function pixelRatioToLatLng(xRatio: number, yRatio: number, bounds: MockBounds = DEFAULT_MOCK_BOUNDS) {
  const latRange = bounds.maxLat - bounds.minLat || 1;
  const lngRange = bounds.maxLng - bounds.minLng || 1;
  const lat = bounds.maxLat - yRatio * latRange;
  const lng = bounds.minLng + xRatio * lngRange;
  return { lat, lng };
}

/** pixelRatioToLatLng의 역변환. 좌표를 같은 bounds 기준 화면 비율(0~1)로 환산합니다. */
export function latLngToPixelRatio(lat: number, lng: number, bounds: MockBounds = DEFAULT_MOCK_BOUNDS) {
  const latRange = bounds.maxLat - bounds.minLat || 1;
  const lngRange = bounds.maxLng - bounds.minLng || 1;
  const xRatio = (lng - bounds.minLng) / lngRange;
  const yRatio = (bounds.maxLat - lat) / latRange;
  return {
    x: Math.min(1, Math.max(0, xRatio)),
    y: Math.min(1, Math.max(0, yRatio)),
  };
}
