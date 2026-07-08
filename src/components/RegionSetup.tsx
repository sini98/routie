"use client";

import { useEffect, useState } from "react";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";

/**
 * 앱 최초 진입 시 한 번, 위치 권한을 조용히 요청해 기본 지역을 정합니다. 허용하면 현재
 * 위치를 기본 지역으로 저장하고, 거부/미지원이거나 이미 기본 지역이 있으면 아무것도 하지
 * 않습니다(별도 안내 화면 없음). 예전에는 여기서 고정된 지역 목록(서울/부산/대구 등)을
 * 골라야 했는데, 목록에 없는 지역이면 사용자가 자기 지역을 못 찾는 문제가 있었습니다.
 * 이 기본 지역은 일정에 장소가 하나도 없을 때만 지도 초기 중심으로 쓰이는 값일 뿐이라,
 * 다른 지역으로 일정을 시작하고 싶으면 그냥 장소를 추가할 때 위치 선택 화면
 * (`LocationPicker`)에서 원하는 지역/장소를 검색하면 됩니다(그 장소의 좌표가 곧바로
 * 우선하게 되어 기본 지역을 따로 바꿀 필요가 없습니다). 이 컴포넌트는 화면을 그리지 않는
 * 조용한 초기화 훅 역할만 합니다.
 */
export default function RegionSetup() {
  const [defaultRegion, setDefaultRegion, isLoaded] = useDefaultRegion();
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    if (!isLoaded || hasAttempted || defaultRegion) return;
    setHasAttempted(true);

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDefaultRegion({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        // 거부/실패해도 강제로 아무 화면을 띄우지 않습니다 — 홈 화면 지역 검색으로 대체합니다.
      },
      { timeout: 8000 }
    );
  }, [isLoaded, hasAttempted, defaultRegion, setDefaultRegion]);

  return null;
}
