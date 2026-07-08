"use client";

import { useEffect, useRef } from "react";
import { useLocalStorage } from "./useLocalStorage";

export type RegionCoords = { lat: number; lng: number };

const STORAGE_KEY = "routie:defaultRegion";

/**
 * 사용자가 고르거나 위치 권한으로 얻어낸 "기본 지역" 좌표.
 * 일정에 실제 장소가 있으면 그 장소 좌표가 항상 우선하고, 이 값은 장소가 하나도 없을 때
 * 지도가 어디를 보여줄지 결정하는 기본값으로만 쓰입니다.
 */
export function useDefaultRegion() {
  const [value, setValue, isLoaded] = useLocalStorage<RegionCoords | null>(STORAGE_KEY, null);

  // 디버깅용: 이 훅을 쓰는 모든 컴포넌트(NaverMap, useAutoLocate, RegionSetup, RegionSearch)에서
  // routie:defaultRegion 값이 실제로 무엇인지, 언제 바뀌는지 콘솔에서 바로 확인할 수 있습니다.
  const prevValueRef = useRef<RegionCoords | null | undefined>(undefined);
  useEffect(() => {
    if (!isLoaded) return;
    if (prevValueRef.current === value) return;
    console.log("[Routie][Debug][useDefaultRegion] routie:defaultRegion 값", {
      value,
      changedFrom: prevValueRef.current,
    });
    prevValueRef.current = value;
  }, [value, isLoaded]);

  return [value, setValue, isLoaded] as const;
}
