"use client";

import { MouseEvent, useRef } from "react";
import { motion } from "framer-motion";
import { Place } from "@/types/place";
import { getOrderBadge } from "@/lib/order";
import { DEFAULT_MOCK_BOUNDS, latLngToPixelRatio, pixelRatioToLatLng } from "@/lib/mockGeo";

type Coords = { lat: number; lng: number };

type MockMapProps = {
  places: Place[];
  selectedId: string | null;
  onSelectPlace: (id: string | null) => void;
  isPickingLocation?: boolean;
  pickedLocation?: Coords | null;
  onPickLocation?: (lat: number, lng: number) => void;
};

/**
 * 네이버 지도 API 키가 없거나 스크립트 로딩에 실패했을 때 보여주는 대체 지도 UI.
 * 실제 지도 대신 좌표를 정규화한 좌표 평면 위에 순번 마커와 동선을 그려 보여줍니다.
 * 위치 선택 모드에서는 클릭 위치를 대략적인 좌표로 환산해 선택을 완료할 수 있습니다.
 */
export default function MockMap({
  places,
  selectedId,
  onSelectPlace,
  isPickingLocation = false,
  pickedLocation = null,
  onPickLocation,
}: MockMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 마커 배치, 클릭→좌표 변환, 임시 핀 렌더링이 모두 같은 좌표 범위를 기준으로 계산되어야
  // 서로 어긋나지 않습니다. places뿐 아니라 검색/클릭으로 고른 pickedLocation까지 포함해서
  // 범위를 잡아, 서울 권역을 벗어난 지역(예: 거제, 대구)을 검색해도 그 지점이 화면 가장자리로
  // 잘리거나(clamp) 엉뚱한 좌표로 환산되지 않도록 합니다.
  const boundsLats = places.map((place) => place.lat);
  const boundsLngs = places.map((place) => place.lng);
  if (pickedLocation) {
    boundsLats.push(pickedLocation.lat);
    boundsLngs.push(pickedLocation.lng);
  }

  const hasPoints = boundsLats.length > 0;
  const rawMinLat = hasPoints ? Math.min(...boundsLats) : DEFAULT_MOCK_BOUNDS.minLat;
  const rawMaxLat = hasPoints ? Math.max(...boundsLats) : DEFAULT_MOCK_BOUNDS.maxLat;
  const rawMinLng = hasPoints ? Math.min(...boundsLngs) : DEFAULT_MOCK_BOUNDS.minLng;
  const rawMaxLng = hasPoints ? Math.max(...boundsLngs) : DEFAULT_MOCK_BOUNDS.maxLng;

  // 위/경도 범위가 너무 좁으면(포인트가 1개뿐이거나 모두 같은 위치) 클릭 정밀도를 위해
  // 최소 여백(약 2km 상당)을 확보합니다.
  const MIN_SPAN = 0.02;
  const latSpan = Math.max(rawMaxLat - rawMinLat, MIN_SPAN);
  const lngSpan = Math.max(rawMaxLng - rawMinLng, MIN_SPAN);
  const latPad = (latSpan - (rawMaxLat - rawMinLat)) / 2;
  const lngPad = (lngSpan - (rawMaxLng - rawMinLng)) / 2;

  const bounds = {
    minLat: rawMinLat - latPad,
    maxLat: rawMaxLat + latPad,
    minLng: rawMinLng - lngPad,
    maxLng: rawMaxLng + lngPad,
  };

  const padding = 14;
  const latRange = bounds.maxLat - bounds.minLat || 1;
  const lngRange = bounds.maxLng - bounds.minLng || 1;

  const positions = places.map((place) => {
    const xRatio = (place.lng - bounds.minLng) / lngRange;
    const yRatio = (bounds.maxLat - place.lat) / latRange;
    return {
      id: place.id,
      x: padding + xRatio * (100 - padding * 2),
      y: padding + yRatio * (100 - padding * 2),
    };
  });

  const handleMapClick = (event: MouseEvent<HTMLDivElement>) => {
    if (isPickingLocation) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const xRatio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const yRatio = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      const coords = pixelRatioToLatLng(xRatio, yRatio, bounds);
      console.log("[Routie] Mock Map picked location", coords.lat, coords.lng);
      onPickLocation?.(coords.lat, coords.lng);
      return;
    }

    // 일반 모드에서는 핀이 아닌 빈 영역을 누르면 선택을 해제합니다.
    // (핀 버튼은 자체 onClick에서 stopPropagation을 호출해 여기까지 전파되지 않습니다.)
    onSelectPlace(null);
  };

  const pickedPixel = pickedLocation ? latLngToPixelRatio(pickedLocation.lat, pickedLocation.lng, bounds) : null;

  return (
    <div
      ref={containerRef}
      onClick={handleMapClick}
      className={`relative h-full w-full overflow-hidden bg-gradient-to-br from-accent to-muted ${
        isPickingLocation ? "cursor-crosshair" : ""
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(#dbe4f5_1px,transparent_1px),linear-gradient(90deg,#dbe4f5_1px,transparent_1px)] [background-size:24px_24px]" />

      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {positions.slice(1).map((pos, i) => (
          <line
            key={pos.id}
            x1={positions[i].x}
            y1={positions[i].y}
            x2={pos.x}
            y2={pos.y}
            stroke="#4F7FFF"
            strokeWidth={0.6}
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {positions.map((pos, index) => {
        const place = places[index];
        const isSelected = place.id === selectedId;
        return (
          <motion.button
            key={place.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (isPickingLocation) {
                onPickLocation?.(place.lat, place.lng);
              } else {
                onSelectPlace(place.id === selectedId ? null : place.id);
              }
            }}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, x: "-50%", y: "-50%" }}
            animate={{ scale: isSelected ? 1.5 : 1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className={`absolute flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white text-[11px] font-bold text-primary shadow-sm transition-colors ${
              isSelected ? "border-2 border-primary shadow-md" : "border border-[#E5E7EB]"
            }`}
          >
            {getOrderBadge(index)}
          </motion.button>
        );
      })}

      {isPickingLocation && pickedPixel && (
        // 회전된 teardrop 모양은 중심과 시각적 꼭짓점이 어긋나 클릭 위치와 마커가 어긋나 보일 수 있어,
        // 중심이 곧 클릭 좌표인 단순한 원형으로 표시합니다.
        <div
          style={{
            left: `${pickedPixel.x * 100}%`,
            top: `${pickedPixel.y * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
          className="pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white bg-primary shadow-md"
        />
      )}

      {!isPickingLocation && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-[11px] text-muted-foreground shadow-sm">
          지도 API 미설정: Mock Map으로 표시 중
        </div>
      )}
    </div>
  );
}
