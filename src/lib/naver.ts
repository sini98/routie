import { Place } from "@/types/place";

/**
 * 네이버지도 길찾기(검색)로 연결할 URL을 반환합니다.
 * 사용자가 URL을 직접 입력하지 않아도 되도록, 저장된 위도/경도로 좌표 검색 URL을 만듭니다.
 * (네이버지도는 "위도,경도" 형태의 검색어를 그 좌표 위치로 인식합니다.)
 */
export function getNaverDirectionsUrl(place: Place): string {
  return `https://map.naver.com/v5/search/${place.lat},${place.lng}`;
}

export type NaverPlaceSearchResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

/**
 * 추후 네이버 검색 API 연동을 위한 확장 지점.
 * MVP에서는 사용하지 않으며, 장소 추가 폼에서 이름 검색 자동완성을 붙이고 싶을 때
 * 이 함수의 구현을 실제 API 호출로 교체하면 됩니다.
 */
export async function searchNaverPlace(_query: string): Promise<NaverPlaceSearchResult[]> {
  return [];
}
