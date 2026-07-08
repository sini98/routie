"use client";

import { useEffect, useRef } from "react";
import { DEFAULT_COORDS, Place } from "@/types/place";
import { getOrderBadge } from "@/lib/order";
import { useNaverMapsLoader } from "@/hooks/useNaverMapsLoader";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";

type Coords = { lat: number; lng: number };

/** token이 바뀔 때마다(같은 좌표라도) 지도를 강제로 그 위치로 이동시키기 위한 요청 신호 */
export type FocusRequest = Coords & { token: number };

type NaverMapProps = {
  places: Place[];
  selectedId: string | null;
  onSelectPlace: (id: string | null) => void;
  onReady: () => void;
  onLoadError: () => void;
  /** 위치 선택 모드 여부. true인 동안 지도 클릭이 onPickLocation으로 연결됩니다. */
  isPickingLocation?: boolean;
  /** 위치 선택 모드에서 현재 선택된 좌표 (임시 마커로 표시됩니다). */
  pickedLocation?: Coords | null;
  onPickLocation?: (lat: number, lng: number) => void;
  /** 검색 결과 등으로 지도를 특정 좌표로 강제 이동시키고 싶을 때 사용합니다. */
  focusRequest?: FocusRequest | null;
};

const MIN_ZOOM = 10;
const MAX_ZOOM = 17;

export default function NaverMap({
  places,
  selectedId,
  onSelectPlace,
  onReady,
  onLoadError,
  isPickingLocation = false,
  pickedLocation = null,
  onPickLocation,
  focusRequest = null,
}: NaverMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const pickMarkerRef = useRef<any>(null);
  const hasCenteredForPickingRef = useRef(false);
  const lastFocusTokenRef = useRef<number | null>(null);
  const prevPlacesRef = useRef<Place[] | null>(null);
  const status = useNaverMapsLoader();
  const [defaultRegion] = useDefaultRegion();

  // 지도 SDK 로딩 상태에 따라 지도 인스턴스를 초기화하거나 에러를 알립니다.
  // 장소가 하나도 없을 때 지도를 어디부터 보여줄지는 사용자가 고른(또는 위치 권한으로 얻은)
  // 기본 지역을 우선 사용하고, 아직 정해지지 않았으면 서울을 fallback으로 씁니다.
  useEffect(() => {
    if (status === "error") {
      onLoadError();
      return;
    }
    if (status !== "ready" || !mapContainerRef.current || mapRef.current) return;

    const naver = window.naver;
    const center = defaultRegion ?? DEFAULT_COORDS;
    // 확대/축소 버튼(UI)은 숨기되, 마우스 휠/드래그/모바일 핀치 확대는 기본값 그대로 동작합니다.
    mapRef.current = new naver.maps.Map(mapContainerRef.current, {
      center: new naver.maps.LatLng(center.lat, center.lng),
      zoom: 14,
      zoomControl: false,
    });
    onReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, defaultRegion]);

  // 컨테이너 실제 크기가 바뀔 때마다 네이버 지도 내부 크기 캐시를 갱신해,
  // 확대/축소와 무관하게 클릭 좌표 변환이 항상 실제 렌더링 크기 기준으로 정확하게 이뤄지도록 합니다.
  useEffect(() => {
    if (status !== "ready" || !mapContainerRef.current) return;

    const container = mapContainerRef.current;
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current && window.naver?.maps) {
        window.naver.maps.Event.trigger(mapRef.current, "resize");
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [status]);

  // 장소/선택 상태가 바뀔 때마다 마커와 폴리라인을 다시 그립니다.
  useEffect(() => {
    const naver = window.naver;
    if (!mapRef.current || !naver?.maps) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (places.length === 0) {
      prevPlacesRef.current = places;
      return;
    }

    const bounds = new naver.maps.LatLngBounds();

    places.forEach((place, index) => {
      const position = new naver.maps.LatLng(place.lat, place.lng);
      bounds.extend(position);
      const isSelected = place.id === selectedId;

      const marker = new naver.maps.Marker({
        position,
        map: mapRef.current,
        icon: {
          // 경로(Polyline)와 색이 겹쳐 무거워 보이지 않도록, 마커는 흰 배경 + 브랜드 블루 숫자 +
          // 옅은 회색 테두리로 가볍게 표시합니다. 선택 시에는 채우기 대신 테두리 색/두께와
          // 그림자, 크기로만 강조해 파란 면적이 늘어나지 않게 합니다.
          content: `
            <div style="
              display:flex;align-items:center;justify-content:center;
              width:22px;height:22px;border-radius:9999px;box-sizing:border-box;
              background:#ffffff;
              border:${isSelected ? "2px solid hsl(var(--primary))" : "1.5px solid #E5E7EB"};
              color:hsl(var(--primary));
              font-weight:700;font-size:11px;
              box-shadow:${isSelected ? "0 2px 6px rgba(15,23,42,0.28)" : "0 1px 3px rgba(15,23,42,0.12)"};
              transform:${isSelected ? "scale(1.5)" : "scale(1)"};
              transition:transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
            ">${getOrderBadge(index)}</div>
          `,
          anchor: new naver.maps.Point(11, 11),
        },
      });

      // 위치 선택 모드에서는 기존 장소 마커를 눌러도 그 자리의 좌표를 선택하게 해서,
      // 마커가 지도 클릭을 "막는" 것처럼 느껴지지 않도록 합니다.
      // 이미 선택된 마커를 다시 누르면 선택을 해제합니다(토글).
      naver.maps.Event.addListener(marker, "click", () => {
        if (isPickingLocation) {
          onPickLocation?.(place.lat, place.lng);
        } else {
          onSelectPlace(place.id === selectedId ? null : place.id);
        }
      });
      markersRef.current.push(marker);
    });

    if (places.length > 1) {
      polylineRef.current = new naver.maps.Polyline({
        map: mapRef.current,
        path: places.map((place) => new naver.maps.LatLng(place.lat, place.lng)),
        strokeColor: "#4F7FFF",
        strokeWeight: 4,
        strokeOpacity: 0.85,
        clickable: false,
      });
    }

    // 장소 목록 자체가 바뀐 경우(추가/삭제/순서변경)에는 위치를 다시 잡습니다.
    // 장소가 1개면 고정 줌으로, 2개 이상이면 항상 fitBounds로 모든 장소가 한 화면에 보이도록 합니다.
    // (일부만 확대되고 다른 장소가 화면 밖으로 나가는 문제를 막기 위해 고정 줌은 1개일 때만 사용합니다.)
    // 목록은 그대로인데 선택만 바뀐 경우에는 선택된 마커로 부드럽게 이동(panTo)합니다.
    const placesChanged = prevPlacesRef.current !== places;
    prevPlacesRef.current = places;

    if (placesChanged) {
      if (places.length === 1) {
        mapRef.current.setCenter(bounds.getCenter());
        mapRef.current.setZoom(16);
      } else {
        // 가장자리와 마커가 붙지 않도록 상하좌우 충분한 여백을 주고, 중심은 fitBounds가 전체 장소의 가운데로 맞춰줍니다.
        mapRef.current.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 });

        // 장소들이 너무 가깝게 모여 있거나 너무 멀리 퍼져 있어도 과도하게 확대/축소되지 않도록 보정합니다.
        const zoomAfterFit = mapRef.current.getZoom();
        if (zoomAfterFit > MAX_ZOOM) {
          mapRef.current.setZoom(MAX_ZOOM);
        } else if (zoomAfterFit < MIN_ZOOM) {
          mapRef.current.setZoom(MIN_ZOOM);
        }
      }
    } else if (selectedId) {
      const selectedPlace = places.find((place) => place.id === selectedId);
      if (selectedPlace) {
        mapRef.current.panTo(new naver.maps.LatLng(selectedPlace.lat, selectedPlace.lng));
      }
    }
  }, [places, selectedId, onSelectPlace, isPickingLocation, onPickLocation, status]);

  // 위치 선택 모드일 때만 지도 click 이벤트를 실제 map 인스턴스에 연결합니다.
  // 좌표는 항상 e.coord(네이버가 클릭 시점에 직접 계산한 값)만 사용합니다. 과거에는 이 리스너가
  // 혹시 안 붙는 경우를 대비해 DOM onClick + getProjection().fromOffsetToCoord() fallback을
  // 함께 두었는데, 두 리스너가 매 클릭마다 동시에 실행되며 서로 다른 값(특히 fallback 쪽은
  // 방금 setCenter/setZoom한 직후라면 최신 projection을 반영 못 할 수 있음)을 계산해 나중에
  // 실행되는 쪽이 정확한 좌표를 덮어써버리는 문제가 있었습니다. 이제는 이 리스너 하나만 사용합니다.
  useEffect(() => {
    if (!mapRef.current) return;
    if (!window.naver?.maps) return;
    if (!isPickingLocation) return;

    const listener = window.naver.maps.Event.addListener(mapRef.current, "click", (e: any) => {
      const lat = e.coord.lat();
      const lng = e.coord.lng();
      console.log("map clicked", lat, lng);
      onPickLocation?.(lat, lng);
    });

    console.log("map click listener registered");

    return () => {
      window.naver.maps.Event.removeListener(listener);
      console.log("map click listener removed");
    };
  }, [isPickingLocation, onPickLocation, status]);

  // 일반 모드(위치 선택 중이 아닐 때)에는 지도의 빈 영역을 누르면 선택을 해제합니다.
  // 마커 클릭은 별도 리스너(marker의 "click")로 처리되어 여기로 전파되지 않습니다.
  useEffect(() => {
    if (!mapRef.current) return;
    if (!window.naver?.maps) return;
    if (isPickingLocation) return;

    const listener = window.naver.maps.Event.addListener(mapRef.current, "click", () => {
      onSelectPlace(null);
    });

    return () => {
      window.naver.maps.Event.removeListener(listener);
    };
  }, [isPickingLocation, onSelectPlace, status]);

  // 위치 선택 모드의 임시 마커를 그립니다.
  useEffect(() => {
    const naver = window.naver;
    if (!mapRef.current || !naver?.maps) return;

    if (pickMarkerRef.current) {
      pickMarkerRef.current.setMap(null);
      pickMarkerRef.current = null;
    }

    if (isPickingLocation && pickedLocation) {
      const position = new naver.maps.LatLng(pickedLocation.lat, pickedLocation.lng);
      // 회전된(teardrop) 모양은 anchor 계산이 어긋나기 쉬워 클릭 위치와 마커가 어긋나 보일 수 있으므로,
      // 중심이 곧 anchor인 단순한 원형으로 표시해 확대 수준과 무관하게 정확히 클릭한 지점에 그립니다.
      pickMarkerRef.current = new naver.maps.Marker({
        position,
        map: mapRef.current,
        icon: {
          content: `
            <div style="
              width:20px;height:20px;border-radius:9999px;
              background:#4F7FFF;border:3px solid #ffffff;
              box-shadow:0 2px 6px rgba(15,23,42,0.35);
            "></div>
          `,
          anchor: new naver.maps.Point(10, 10),
        },
      });

      // 수정 중이던 장소의 기존 좌표로 위치 선택 모드에 진입한 경우, 처음 한 번만 그 위치로 지도를 이동합니다.
      if (!hasCenteredForPickingRef.current) {
        mapRef.current.setCenter(position);
        mapRef.current.setZoom(16);
        hasCenteredForPickingRef.current = true;
      }
    }

    if (!isPickingLocation) {
      hasCenteredForPickingRef.current = false;
    }
  }, [isPickingLocation, pickedLocation, status]);

  // 검색 결과 등 명시적인 focusRequest가 들어오면, 같은 좌표라도 token이 바뀌었으면 다시 이동합니다.
  useEffect(() => {
    const naver = window.naver;
    if (!mapRef.current || !naver?.maps || !focusRequest) return;
    if (lastFocusTokenRef.current === focusRequest.token) return;

    lastFocusTokenRef.current = focusRequest.token;
    mapRef.current.setCenter(new naver.maps.LatLng(focusRequest.lat, focusRequest.lng));
    mapRef.current.setZoom(16);
  }, [focusRequest, status]);

  return <div ref={mapContainerRef} className="pointer-events-auto h-full w-full" />;
}
