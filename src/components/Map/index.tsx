"use client";

import { useState } from "react";
import { Place } from "@/types/place";
import NaverMap, { type FocusRequest } from "./NaverMap";
import MockMap from "./MockMap";

type Coords = { lat: number; lng: number };

type MapProps = {
  places: Place[];
  selectedId: string | null;
  onSelectPlace: (id: string | null) => void;
  /** 위치 선택 모드 여부. true인 동안 지도 클릭이 onPickLocation으로 연결됩니다. */
  isPickingLocation?: boolean;
  /** 위치 선택 모드에서 현재 선택된 좌표 (임시 마커로 표시됩니다). */
  pickedLocation?: Coords | null;
  onPickLocation?: (lat: number, lng: number) => void;
  /** 검색 결과 등으로 지도를 특정 좌표로 강제 이동시키고 싶을 때 사용합니다(네이버 지도 전용). */
  focusRequest?: FocusRequest | null;
  /**
   * "오늘 외출 + 장소 0개"처럼 defaultRegion(지정 외출에서 검색해둔 지역 등)을 무시하고
   * 현재 위치(또는 실패 시 서울)만 쓰고 싶은 화면에서 넘기세요. NaverMap 전용이며 자세한
   * 설명은 그쪽 타입 주석 참고.
   */
  currentLocationOnly?: Coords | null;
};

/**
 * NEXT_PUBLIC_NAVER_MAP_CLIENT_ID가 없으면 즉시 Mock Map을 보여주고,
 * 있으면 스크립트를 로드하는 동안 로딩 문구를 보여주다가 로드가 끝나면 실제 지도를,
 * 로드에 실패하면 Mock Map으로 전환합니다.
 */
export default function Map({
  places,
  selectedId,
  onSelectPlace,
  isPickingLocation = false,
  pickedLocation = null,
  onPickLocation,
  focusRequest = null,
  currentLocationOnly,
}: MapProps) {
  const hasClientId = Boolean(process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(hasClientId ? "loading" : "error");

  if (!hasClientId || status === "error") {
    return (
      <MockMap
        places={places}
        selectedId={selectedId}
        onSelectPlace={onSelectPlace}
        isPickingLocation={isPickingLocation}
        pickedLocation={pickedLocation}
        onPickLocation={onPickLocation}
      />
    );
  }

  return (
    // isolate로 새 stacking context를 만들어, 네이버 지도가 자체적으로 붙이는
    // 저작권/로고/축척 UI가 아무리 높은 z-index를 쓰더라도 이 박스 밖으로 새어나가지 못하게 막습니다.
    // overflow-hidden은 그 내부 UI가 지도 영역 경계 밖으로 삐져나오는 것도 함께 막아줍니다.
    <div className="relative isolate z-0 h-full w-full overflow-hidden">
      <NaverMap
        places={places}
        selectedId={selectedId}
        onSelectPlace={onSelectPlace}
        onReady={() => setStatus("ready")}
        onLoadError={() => setStatus("error")}
        isPickingLocation={isPickingLocation}
        pickedLocation={pickedLocation}
        onPickLocation={onPickLocation}
        focusRequest={focusRequest}
        currentLocationOnly={currentLocationOnly}
      />
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-accent">
          <p className="text-sm font-medium text-muted-foreground">지도를 불러오는 중...</p>
        </div>
      )}
    </div>
  );
}
