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

/** 오늘 날짜에 처음 진입했을 때 한 번 시딩되는 예시 일정 */
export const INITIAL_PLACES: Place[] = [
  { id: "1", name: "서울아산병원", time: "18:00", memo: "정기 검진", lat: 37.5262, lng: 127.1086 },
  { id: "2", name: "잠실 카페", time: "19:30", memo: "대기 시간 보내기", lat: 37.5133, lng: 127.1 },
  { id: "3", name: "저녁식사", time: "21:00", memo: "근처 맛집", lat: 37.511, lng: 127.0982 },
];
