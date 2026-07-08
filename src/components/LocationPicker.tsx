"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LocateFixed, Loader2, Search, Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Map from "@/components/Map";
import type { FocusRequest } from "@/components/Map/NaverMap";
import { markLocationPickerClosed, markLocationPickerOpen } from "@/lib/locationPickerGuard";
import { geocodeQuery, reverseGeocodeQuery, searchPlaces } from "@/lib/geocode";
import { useAutoLocate } from "@/hooks/useAutoLocate";
import type { Place } from "@/types/place";

type Coords = { lat: number; lng: number };

type LocationPickerProps = {
  initialCoords: Coords | null;
  /** 같은 일정에 이미 저장된 다른 장소들(현재 수정 중인 장소는 제외). bounds 기준으로 씁니다. */
  existingPlaces: Place[];
  /** 오늘 외출인지 여부 — 장소가 0개일 때 현재 위치를 우선할지 판단하는 데 씁니다. */
  isToday: boolean;
  onCancel: () => void;
  /** suggestedName은 "장소명" 입력칸에 자동으로 채워 넣을 이름 제안입니다. 강제가 아니라
   * 제안일 뿐이라 항상 사용자가 그대로 수정할 수 있어야 합니다. */
  onConfirm: (coords: Coords, suggestedName: string | null) => void;
};

type StatusMessage = { text: string; tone: "info" | "error" };

// searchPlaces(네이버 검색 API) 결과 후보. 좌표는 없고 주소만 있습니다 — 사용자가 고르면
// 그 주소를 geocodeQuery(NCP Geocoding)에 다시 넣어서 최종 좌표를 얻습니다.
type PlaceCandidate = {
  key: string;
  name: string;
  description?: string;
  address: string;
};

// 두 검색(app/api/search-place, app/api/geocode)이 모두 실패했을 때 원인을 구분해서 안내합니다.
function describeSearchFailure(placeReason: string | undefined, regionReason: string | undefined) {
  if (placeReason === "AUTH_FAILED" || regionReason === "AUTH_FAILED") {
    return "네이버 API 인증에 실패했어요. Client ID/Secret 설정을 확인해주세요.";
  }
  if (placeReason === "MISSING_CONFIG" && regionReason === "MISSING_CONFIG") {
    return "네이버 검색 API 키가 설정되지 않았어요. .env.local을 확인해주세요.";
  }
  return "검색 결과를 찾을 수 없어요. 지도에서 직접 위치를 선택해주세요.";
}

/**
 * 전체 화면 위치 선택 모드. 상위 PlaceForm Bottom Sheet도 Radix Dialog이므로,
 * 이 화면도 raw portal 대신 Radix Dialog(Root/Portal/Content)로 만들어야 "중첩된 레이어"로
 * 올바르게 인식됩니다. Radix는 여러 Dialog가 겹쳐 열렸을 때 가장 위(나중에 열린) 레이어의
 * 포커스 트랩/바깥 클릭 감지를 우선하므로, 상위 Sheet의 modal 설정을 건드릴 필요가 없습니다.
 * (Sheet의 modal을 열려 있는 상태에서 동적으로 바꾸면 Radix가 그 내부 트리 전체를
 * 언마운트/재마운트해버리는 문제가 있었습니다 — ui/sheet.tsx 참고.)
 *
 * markLocationPickerOpen/Closed + data-routie-overlay 마커는 만약을 대비한 추가 방어선으로 남겨둡니다.
 *
 * 검색은 두 단계입니다.
 * 1. searchPlaces(카페·음식점·역·상호명 같은 장소 전용, 네이버 검색 API)를 먼저 호출합니다.
 *    결과가 있으면 이름/주소 목록으로 보여주고, 아직 좌표로 바꾸지 않습니다.
 * 2. 사용자가 목록에서 하나를 고르면 그 주소를 geocodeQuery(지역명/주소 전용, NCP Maps
 *    Geocoding)에 다시 넣어 최종 좌표를 얻습니다. searchPlaces가 결과 없음/실패면 입력한
 *    검색어를 곧바로 geocodeQuery에 넣어(기존 지역명 검색과 동일하게) 지도를 이동시킵니다.
 * 이렇게 두 단계로 나눈 이유는 네이버 검색 API가 주는 좌표(mapx/mapy)의 좌표계가 불명확해
 * 신뢰할 수 없었기 때문입니다 — 좌표는 항상 이미 검증된 Geocoding에서만 가져옵니다.
 * 어느 경로든 지도에 바로 확정되는 건 아니고, 기존과 동일하게 "이 위치로 선택"을 눌러야
 * 최종 반영됩니다.
 *
 * 지도 중심 결정 로직은 OutingScreen의 작은 지도와 완전히 동일합니다(NaverMap.tsx를 그대로
 * 공유) — 같은 일정에 저장된 다른 장소가 있으면 그 장소들 기준으로 bounds를 맞추고
 * (existingPlaces를 그대로 Map의 places로 전달), 오늘 외출이고 장소가 0개면 현재 위치를
 * 최우선으로 씁니다(currentLocationOnly). 예전에는 이 화면이 항상 places={[]}만 넘기고
 * currentLocationOnly도 안 넘겨서, 장소 0개일 때 여기(큰 지도)만 예전 defaultRegion(지정
 * 외출에서 검색해둔 지역 등)으로 계속 열리는 문제가 있었습니다.
 */
export default function LocationPicker({
  initialCoords,
  existingPlaces,
  isToday,
  onCancel,
  onConfirm,
}: LocationPickerProps) {
  const [pending, setPending] = useState<Coords | null>(initialCoords);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  // "장소명" 입력칸에 자동으로 채워 넣을 이름 제안입니다 — 검색 결과를 고르면 그 이름을,
  // 지도를 직접 찍으면 역지오코딩 결과를 씁니다. 항상 제안일 뿐이라 폼에서 그대로 수정할 수
  // 있습니다.
  const [suggestedName, setSuggestedName] = useState<string | null>(null);
  // 지도를 연달아 여러 번 탭했을 때, 먼저 시작된(느린) 역지오코딩 응답이 나중에 도착해서
  // 최신 위치의 제안 이름을 덮어써버리지 않도록 매번 새 토큰을 발급해 마지막 요청만 반영합니다.
  const reverseGeocodeTokenRef = useRef(0);

  // 오늘 외출이고 이 일정에 저장된 다른 장소가 하나도 없을 때만 현재 위치를 우선 조회합니다
  // (OutingScreen과 동일한 조건).
  const useLiveLocation = isToday && existingPlaces.length === 0;
  const {
    status: locateStatus,
    currentLocation,
    requestNow: requestCurrentLocation,
  } = useAutoLocate(useLiveLocation);

  useEffect(() => {
    console.log("[Routie] LocationPicker 열림 (isSelectingLocation = true)", { initialCoords });
    markLocationPickerOpen();
    return () => {
      markLocationPickerClosed();
      console.log("[Routie] LocationPicker 닫힘 (isSelectingLocation = false)");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // NaverMap.tsx가 실제로 쓰는 것과 동일한 reason 어휘입니다(currentLocation/defaultLocation/
    // savedRegion/savedItinerary) — 자세한 finalCenter 결정 로그는 [Routie][Debug][NaverMap]
    // 쪽에서 확인하세요(이 화면도 그 컴포넌트를 그대로 씁니다).
    const reason =
      existingPlaces.length > 0
        ? "savedItinerary"
        : !useLiveLocation
          ? "savedRegion(defaultRegion) 또는 defaultLocation"
          : currentLocation
            ? "currentLocation"
            : "defaultLocation(현재 위치 조회 중이거나 실패)";
    console.log("[Routie][Debug][LocationPicker] 큰 지도 진입 — 위치 결정 상태", {
      isToday,
      existingPlacesLength: existingPlaces.length,
      useLiveLocation,
      locateStatus,
      currentLocation,
      reason,
    });
  }, [isToday, existingPlaces.length, useLiveLocation, locateStatus, currentLocation]);

  // 좌표만으로는 이름을 알 수 없는 경우(지도 직접 탭, 지역명 검색 fallback)에 역지오코딩으로
  // "장소명" 제안을 채웁니다. 건물명 → "도로명 근처" → "행정동 선택 위치" → "선택한 위치"
  // 순서로 서버(app/api/reverse-geocode)가 이미 우선순위를 정해서 내려줍니다.
  const suggestNameFromCoords = async (lat: number, lng: number) => {
    const token = ++reverseGeocodeTokenRef.current;
    setSuggestedName(null);
    const result = await reverseGeocodeQuery(lat, lng);
    if (reverseGeocodeTokenRef.current !== token) return; // 이미 더 최신 위치로 넘어감
    if (!result.ok) {
      console.error("[Routie] 역지오코딩 실패 — 장소명 제안 없이 진행", result.reason);
      return;
    }
    console.log("[Routie] 역지오코딩으로 장소명 제안", result);
    setSuggestedName(result.suggestedName);
  };

  const handlePickLocation = (lat: number, lng: number) => {
    console.log("[Routie] 임시 마커 좌표 갱신", { lat, lng });
    setPending({ lat, lng });
    setCandidates([]);
    setStatusMessage(null);
    suggestNameFromCoords(lat, lng);
  };

  // 검색으로 얻은 좌표를 지도로 옮기는 공통 마무리 단계 (장소 선택 후 geocode 성공 시,
  // 또는 지역명 fallback geocode 성공 시 모두 여기를 거칩니다). 이름 제안은 호출하는 쪽에서
  // 각자 붙입니다 — 검색 후보는 그 이름을 바로 쓰고, 지역명 fallback은 역지오코딩을 씁니다.
  const moveMapTo = (lat: number, lng: number, message: string) => {
    setPending({ lat, lng });
    setCandidates([]);
    const nextToken = focusToken + 1;
    setFocusToken(nextToken);
    setFocusRequest({ lat, lng, token: nextToken });
    setStatusMessage({ text: message, tone: "info" });
  };

  const handleSearchSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isSearching) return;

    setIsSearching(true);
    setStatusMessage(null);
    setCandidates([]);

    // 1단계: 카페/음식점/역/상호명 같은 장소(POI)부터 찾아봅니다.
    const placeResult = await searchPlaces(trimmed);

    if (placeResult.ok && placeResult.places.length > 0) {
      setIsSearching(false);
      setCandidates(
        placeResult.places.map((place, index) => ({
          key: `place-${index}-${place.address}`,
          name: place.name,
          description: [place.category, place.address].filter(Boolean).join(" · "),
          address: place.address,
        }))
      );
      return;
    }

    // 2단계: 장소 결과가 없거나 검색 API 자체가 실패하면, 입력한 검색어를 그대로 지역명/주소로
    // 지오코딩합니다(기존 "불광동"/"대구" 검색과 동일한 경로).
    const regionResult = await geocodeQuery(trimmed);
    setIsSearching(false);

    console.log("[Routie] 검색 결과", { places: placeResult, region: regionResult });

    if (!regionResult.ok) {
      const placeReason = placeResult.ok ? undefined : placeResult.reason;
      console.error("[Routie] 검색 실패", { placeReason, regionReason: regionResult.reason });
      setStatusMessage({ text: describeSearchFailure(placeReason, regionResult.reason), tone: "error" });
      return;
    }

    moveMapTo(
      regionResult.lat,
      regionResult.lng,
      "검색 결과 위치로 이동했어요. 지도에서 직접 눌러 위치를 조정할 수 있어요."
    );
    // 지역명 검색 결과는 특정 상호명이 아니므로, 역지오코딩으로 이름을 다시 추측합니다.
    suggestNameFromCoords(regionResult.lat, regionResult.lng);
  };

  const handleSelectCandidate = async (candidate: PlaceCandidate) => {
    setCandidates([]);
    setIsSearching(true);
    setStatusMessage(null);

    // 장소 후보는 좌표가 없으니, 그 주소를 Geocoding으로 다시 변환해서 최종 좌표를 얻습니다.
    const result = await geocodeQuery(candidate.address);
    setIsSearching(false);

    if (!result.ok) {
      console.error("[Routie] 장소 주소 지오코딩 실패", candidate, result.reason);
      setStatusMessage({
        text: "이 장소의 좌표를 찾지 못했어요. 지도에서 직접 위치를 선택해주세요.",
        tone: "error",
      });
      return;
    }

    moveMapTo(result.lat, result.lng, `"${candidate.name}" 위치로 이동했어요. 지도에서 직접 눌러 위치를 조정할 수 있어요.`);
    // 검색 결과는 이미 이름이 있으니 역지오코딩 없이 그 이름을 그대로 제안합니다. 혹시 앞서
    // 지도 탭으로 시작된 역지오코딩 요청이 아직 안 끝났다면, 토큰을 새로 발급해 그 결과가
    // 나중에 도착해도 이 이름을 덮어쓰지 못하게 합니다.
    reverseGeocodeTokenRef.current += 1;
    setSuggestedName(candidate.name);
  };

  const handleConfirm = () => {
    if (!pending) return;
    console.log("[Routie] 위치 선택 완료 → 폼에 반영", pending, { suggestedName });
    onConfirm(pending, suggestedName);
  };

  return (
    <Dialog.Root
      open
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Content
          data-routie-overlay=""
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="fixed inset-0 z-[10010] bg-background focus:outline-none"
        >
          <Dialog.Title className="sr-only">지도에서 위치를 선택해주세요</Dialog.Title>
          <Dialog.Description className="sr-only">
            지도를 탭하거나 검색해서 장소의 위치를 선택하세요.
          </Dialog.Description>

          {/* 지도가 전체 화면을 채웁니다. 지도 컨테이너 자체는 항상 클릭 가능해야 합니다. */}
          {/* Map 내부에서 이미 isolate + overflow-hidden으로 네이버 지도 저작권/축척 UI를 가둬둡니다. */}
          <div className="pointer-events-auto absolute inset-0 z-0">
            <Map
              places={existingPlaces}
              selectedId={null}
              onSelectPlace={() => {}}
              isPickingLocation
              pickedLocation={pending}
              onPickLocation={handlePickLocation}
              focusRequest={focusRequest}
              currentLocationOnly={useLiveLocation ? currentLocation : undefined}
            />

            {/* 오늘 외출 + 저장된 장소 0개일 때만 나타납니다. 위치 조회가 끝나기 전에는 지도를
                가려서, defaultRegion 등 예전 값이 잠깐이라도 보이지 않게 합니다(OutingScreen의
                작은 지도와 동일한 처리). */}
            {useLiveLocation && locateStatus === "checking" && (
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-accent text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="text-xs font-medium">현재 위치를 불러오는 중...</p>
              </div>
            )}

            {useLiveLocation && locateStatus === "needs-permission" && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <button
                  type="button"
                  onClick={requestCurrentLocation}
                  className="pointer-events-auto flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-white"
                >
                  <LocateFixed className="h-3.5 w-3.5" />
                  현재 위치로 시작하기
                </button>
              </div>
            )}
          </div>

          {/* 검색/안내 오버레이: 검색창이 있어 이 영역 전체가 클릭 가능해야 합니다. */}
          <div
            className="pointer-events-auto absolute inset-x-0 top-0 border-b border-border bg-white/95 px-4 pb-3 shadow-sm"
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="pointer-events-none text-sm font-semibold text-foreground">
                원하는 장소를 입력하거나 지도에서 선택해주세요.
              </p>
              <button
                type="button"
                onClick={onCancel}
                aria-label="닫기"
                className="pointer-events-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="pointer-events-auto mt-2 flex gap-2">
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCandidates([]);
                }}
                placeholder="원하는 장소를 입력하거나 지도에서 선택해주세요."
                className="pointer-events-auto h-9 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                className="pointer-events-auto h-9 shrink-0 px-3"
                disabled={isSearching || !query.trim()}
              >
                <Search className="h-3.5 w-3.5" />
                {isSearching ? "검색 중" : "검색"}
              </Button>
            </form>

            {candidates.length > 0 ? (
              <div className="pointer-events-auto mt-2 max-h-60 overflow-y-auto rounded-md border border-border">
                {candidates.map((candidate) => (
                  <button
                    key={candidate.key}
                    type="button"
                    onClick={() => handleSelectCandidate(candidate)}
                    disabled={isSearching}
                    className="flex w-full items-center gap-2 border-b border-border bg-white px-3 py-2 text-left last:border-b-0 hover:bg-muted disabled:opacity-50"
                  >
                    <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{candidate.name}</span>
                      {candidate.description && (
                        <span className="block truncate text-xs text-muted-foreground">{candidate.description}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p
                className={
                  statusMessage
                    ? `pointer-events-none mt-1.5 text-xs ${statusMessage.tone === "error" ? "text-destructive" : "text-primary"}`
                    : "pointer-events-none mt-1.5 text-xs text-muted-foreground"
                }
              >
                {statusMessage?.text ??
                  (pending
                    ? suggestedName
                      ? `"${suggestedName}"(으)로 장소명이 채워져요. 지도에서 직접 눌러 위치를 조정할 수 있어요.`
                      : "지도에서 직접 눌러 위치를 조정할 수 있어요"
                    : "지도를 클릭(탭)하면 임시 마커가 표시돼요")}
              </p>
            )}
          </div>

          {/* 하단 버튼 오버레이: 버튼 영역만 pointer-events-auto, 나머지는 지도로 클릭이 통과합니다. */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex gap-2 p-4"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <Button
              type="button"
              variant="outline"
              className="pointer-events-auto flex-1 bg-white"
              onClick={onCancel}
            >
              취소
            </Button>
            <Button type="button" className="pointer-events-auto flex-1" disabled={!pending} onClick={handleConfirm}>
              이 위치로 선택
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
