"use client";

import { useEffect, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";
import { REGIONS } from "@/types/region";

/**
 * 앱 최초 진입 시 한 번, 위치 권한을 요청해 기본 지역을 정합니다.
 * 허용하면 현재 위치를, 거부(또는 미지원)하면 지역 선택 Bottom Sheet를 보여줍니다.
 * 이미 기본 지역이 정해져 있으면 아무 것도 하지 않습니다.
 */
export default function RegionSetup() {
  const [defaultRegion, setDefaultRegion, isLoaded] = useDefaultRegion();
  const [showPicker, setShowPicker] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    if (!isLoaded || hasAttempted || defaultRegion) return;
    setHasAttempted(true);

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setShowPicker(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDefaultRegion({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        setShowPicker(true);
      },
      { timeout: 8000 }
    );
  }, [isLoaded, hasAttempted, defaultRegion, setDefaultRegion]);

  const handleSelectRegion = (lat: number, lng: number) => {
    setDefaultRegion({ lat, lng });
    setShowPicker(false);
  };

  return (
    <BottomSheet
      open={showPicker}
      onOpenChange={(open) => {
        setShowPicker(open);
        // 아무 지역도 고르지 않고 닫으면 서울을 기본값으로 저장해 다음에 다시 묻지 않습니다.
        if (!open && !defaultRegion) {
          setDefaultRegion(REGIONS[0]);
        }
      }}
      title="지역을 선택해주세요"
    >
      <p className="mb-3 text-xs text-muted-foreground">
        위치 권한이 없어도 지도를 볼 수 있도록 기본 지역을 골라주세요. 일정에 장소가 있으면 항상 그 장소가 먼저
        보여요.
      </p>
      <div className="grid grid-cols-2 gap-2 pb-1">
        {REGIONS.map((region) => (
          <button
            key={region.name}
            type="button"
            onClick={() => handleSelectRegion(region.lat, region.lng)}
            className="rounded-md border border-border bg-white px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {region.name}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
