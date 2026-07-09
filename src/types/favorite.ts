export type FavoritePlace = {
  id: string;
  name: string;
  category?: string;
  memo?: string;
  lat: number;
  lng: number;
};

/** 최초 진입 시 한 번 시딩되는 예시 즐겨찾기 데이터. 여기 쓰는 category는 반드시
 * DEFAULT_CATEGORIES(types/category.ts)에 있는 이름만 써야 합니다 — 그래야 장소 추가/수정
 * 화면의 카테고리 선택지와 즐겨찾기 화면에 보이는 카테고리가 시작부터 어긋나지 않습니다. */
export const MOCK_FAVORITES: FavoritePlace[] = [
  { id: "fav-1", name: "온실카페", category: "카페", lat: 37.5443, lng: 127.0557 },
  { id: "fav-2", name: "리움미술관", category: "가볼 곳", lat: 37.5384, lng: 127.0035 },
  { id: "fav-3", name: "한강뷰 레스토랑", category: "맛집", lat: 37.5215, lng: 127.0409 },
];
