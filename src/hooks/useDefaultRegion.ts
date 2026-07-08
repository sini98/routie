"use client";

import { useLocalStorage } from "./useLocalStorage";

export type RegionCoords = { lat: number; lng: number };

const STORAGE_KEY = "routie:defaultRegion";

/**
 * 사용자가 고르거나 위치 권한으로 얻어낸 "기본 지역" 좌표.
 * 일정에 실제 장소가 있으면 그 장소 좌표가 항상 우선하고, 이 값은 장소가 하나도 없을 때
 * 지도가 어디를 보여줄지 결정하는 기본값으로만 쓰입니다.
 */
export function useDefaultRegion() {
  return useLocalStorage<RegionCoords | null>(STORAGE_KEY, null);
}
