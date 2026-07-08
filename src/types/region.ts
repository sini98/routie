export type Region = {
  name: string;
  lat: number;
  lng: number;
};

/** 위치 권한을 거부했을 때 고를 수 있는 기본 지역 목록 */
export const REGIONS: Region[] = [
  { name: "서울", lat: 37.5665, lng: 126.978 },
  { name: "대구", lat: 35.8714, lng: 128.6014 },
  { name: "부산", lat: 35.1796, lng: 129.0756 },
  { name: "거제", lat: 34.8806, lng: 128.6211 },
  { name: "제주", lat: 33.4996, lng: 126.5312 },
  { name: "광주", lat: 35.1595, lng: 126.8526 },
  { name: "대전", lat: 36.3504, lng: 127.3845 },
  { name: "인천", lat: 37.4563, lng: 126.7052 },
];
