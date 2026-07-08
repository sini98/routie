export type GeocodeSuccess = { ok: true; lat: number; lng: number; address?: string };
export type GeocodeFailure = { ok: false; reason: string | undefined };
export type GeocodeResult = GeocodeSuccess | GeocodeFailure;

/**
 * 서버(app/api/geocode · NCP Maps Geocoding)를 통해 지역명/주소를 좌표로 변환합니다.
 * 실패 원인은 서버가 내려주는 `reason` 코드 그대로 반환하니, 문구는 호출하는 쪽 맥락(지도
 * 화면 vs 홈 화면 등)에 맞게 각자 만들어 쓰세요.
 */
export async function geocodeQuery(query: string): Promise<GeocodeResult> {
  try {
    const response = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!response.ok || typeof data?.lat !== "number" || typeof data?.lng !== "number") {
      return { ok: false, reason: data?.reason };
    }

    return { ok: true, lat: data.lat, lng: data.lng, address: data.address };
  } catch (error) {
    console.error("[Routie] 지오코딩 요청 실패", error);
    return { ok: false, reason: "NETWORK_ERROR" };
  }
}

export type PlaceSearchItem = {
  name: string;
  category?: string;
  /** 이 주소를 geocodeQuery에 다시 넣어야 좌표가 나옵니다 — 이 API 자체는 좌표를 안 줍니다. */
  address: string;
};
export type PlaceSearchSuccess = { ok: true; places: PlaceSearchItem[] };
export type PlaceSearchFailure = { ok: false; reason: string | undefined };
export type PlaceSearchResult = PlaceSearchSuccess | PlaceSearchFailure;

/**
 * 서버(app/api/search-place · 네이버 검색 API 지역 검색)를 통해 카페/음식점/역/상호명 같은
 * 장소(POI)의 이름과 주소를 찾습니다. geocodeQuery(지역명/주소 전용)와는 완전히 다른 네이버
 * API/자격 증명을 쓰는 별개의 엔드포인트이고, 좌표는 주지 않습니다 — 이 결과의 `address`를
 * geocodeQuery에 넘겨서 최종 좌표를 얻으세요(mapx/mapy 좌표계가 불명확해 신뢰할 수 없어서,
 * 이미 검증된 Geocoding으로 한 번 더 변환합니다).
 */
export async function searchPlaces(query: string): Promise<PlaceSearchResult> {
  try {
    const response = await fetch(`/api/search-place?query=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!response.ok || !Array.isArray(data?.places)) {
      return { ok: false, reason: data?.reason };
    }

    return { ok: true, places: data.places };
  } catch (error) {
    console.error("[Routie] 장소 검색 요청 실패", error);
    return { ok: false, reason: "NETWORK_ERROR" };
  }
}

export type ReverseGeocodeSuccess = { ok: true; suggestedName: string; reason: string };
export type ReverseGeocodeFailure = { ok: false; reason: string | undefined };
export type ReverseGeocodeResult = ReverseGeocodeSuccess | ReverseGeocodeFailure;

/**
 * 서버(app/api/reverse-geocode · NCP Maps Reverse Geocoding)를 통해 좌표를 건물명/도로명/행정동
 * 기반 이름으로 바꿉니다. 지도에서 직접 위치를 찍었을 때(검색으로 고른 게 아닐 때) "장소명"
 * 입력칸에 채워 넣을 이름을 추측하는 용도입니다 — 항상 사용자가 직접 수정할 수 있는 제안일
 * 뿐입니다.
 */
export async function reverseGeocodeQuery(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  try {
    const response = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
    const data = await response.json();

    if (!response.ok || typeof data?.suggestedName !== "string") {
      return { ok: false, reason: data?.reason };
    }

    return { ok: true, suggestedName: data.suggestedName, reason: data.reason };
  } catch (error) {
    console.error("[Routie] 역지오코딩 요청 실패", error);
    return { ok: false, reason: "NETWORK_ERROR" };
  }
}
