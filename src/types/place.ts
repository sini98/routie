export type Place = {
  id: string;
  name: string;
  time?: string;
  memo?: string;
  lat: number;
  lng: number;
};

/**
 * 위도/경도를 입력하지 않았을 때 사용하는 기본 좌표 (서울시청 인근).
 * 추후 네이버 검색 API를 연동하면 이 fallback 대신 검색 결과의 실제 좌표를 사용하게 됩니다.
 */
export const DEFAULT_COORDS = {
  lat: 37.5665,
  lng: 126.978,
};
