export type FavoritePlace = {
  id: string;
  name: string;
  category?: string;
  memo?: string;
  lat: number;
  lng: number;
};

/** 최초 진입 시 한 번 시딩되는 예시 즐겨찾기 데이터 */
export const MOCK_FAVORITES: FavoritePlace[] = [
  { id: "fav-1", name: "온실카페", category: "카페", lat: 37.5443, lng: 127.0557 },
  { id: "fav-2", name: "리움미술관", category: "전시/문화", lat: 37.5384, lng: 127.0035 },
  { id: "fav-3", name: "한강뷰 레스토랑", category: "음식점", lat: 37.5215, lng: 127.0409 },
];
