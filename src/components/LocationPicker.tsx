"use client";

import { FormEvent, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Map from "@/components/Map";
import type { FocusRequest } from "@/components/Map/NaverMap";
import { markLocationPickerClosed, markLocationPickerOpen } from "@/lib/locationPickerGuard";

type Coords = { lat: number; lng: number };

type LocationPickerProps = {
  initialCoords: Coords | null;
  onCancel: () => void;
  onConfirm: (coords: Coords) => void;
};

type StatusMessage = { text: string; tone: "info" | "error" };

// 서버(app/api/geocode)가 내려주는 reason 코드별로 원인을 구분해서 안내합니다.
// "결과 없음"과 "API 호출 자체가 실패함"을 같은 문구로 뭉뚱그리지 않기 위함입니다.
function describeGeocodeError(reason: string | undefined) {
  switch (reason) {
    case "NO_RESULTS":
      return "검색 결과를 찾을 수 없어요. 지도에서 직접 위치를 선택해주세요.";
    case "AUTH_FAILED":
      return "네이버 API 인증에 실패했어요. Client ID/Secret 설정을 확인해주세요.";
    case "MISSING_CONFIG":
      return "네이버 지도 API 키가 설정되지 않았어요. .env.local을 확인해주세요.";
    case "UPSTREAM_ERROR":
      return "네이버 지도 서버 요청이 실패했어요. 잠시 후 다시 시도해주세요.";
    case "NETWORK_ERROR":
    case "INVALID_RESPONSE":
    default:
      return "검색 중 문제가 발생했어요. 지도에서 직접 위치를 선택해주세요.";
  }
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
 */
export default function LocationPicker({ initialCoords, onCancel, onConfirm }: LocationPickerProps) {
  const [pending, setPending] = useState<Coords | null>(initialCoords);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [focusToken, setFocusToken] = useState(0);

  useEffect(() => {
    console.log("[Routie] LocationPicker 열림 (isSelectingLocation = true)", { initialCoords });
    markLocationPickerOpen();
    return () => {
      markLocationPickerClosed();
      console.log("[Routie] LocationPicker 닫힘 (isSelectingLocation = false)");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePickLocation = (lat: number, lng: number) => {
    console.log("[Routie] 임시 마커 좌표 갱신", { lat, lng });
    setPending({ lat, lng });
  };

  const handleSearchSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isSearching) return;

    setIsSearching(true);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/geocode?query=${encodeURIComponent(trimmed)}`);
      const data = await response.json();

      if (!response.ok || typeof data?.lat !== "number" || typeof data?.lng !== "number") {
        console.error("[Routie] 검색 실패", { status: response.status, data });
        setStatusMessage({ text: describeGeocodeError(data?.reason), tone: "error" });
        return;
      }

      console.log("[Routie] 검색 결과 좌표", data);
      handlePickLocation(data.lat, data.lng);
      const nextToken = focusToken + 1;
      setFocusToken(nextToken);
      setFocusRequest({ lat: data.lat, lng: data.lng, token: nextToken });
      setStatusMessage({
        text: "검색 결과 위치로 이동했어요. 지도에서 직접 눌러 위치를 조정할 수 있어요.",
        tone: "info",
      });
    } catch (error) {
      console.error("[Routie] 지오코딩 요청 실패", error);
      setStatusMessage({ text: "검색 중 문제가 발생했어요. 지도에서 직접 위치를 선택해주세요.", tone: "error" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    if (!pending) return;
    console.log("[Routie] 위치 선택 완료 → 폼에 반영", pending);
    onConfirm(pending);
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
              places={[]}
              selectedId={null}
              onSelectPlace={() => {}}
              isPickingLocation
              pickedLocation={pending}
              onPickLocation={handlePickLocation}
              focusRequest={focusRequest}
            />
          </div>

          {/* 검색/안내 오버레이: 검색창이 있어 이 영역 전체가 클릭 가능해야 합니다. */}
          <div
            className="pointer-events-auto absolute inset-x-0 top-0 border-b border-border bg-white/95 px-4 pb-3 shadow-sm"
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="pointer-events-none text-sm font-semibold text-foreground">
                지역명(시·군·구·읍·면·동)을 검색한 후, 지도에서 원하는 위치를 선택하세요.
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
                onChange={(event) => setQuery(event.target.value)}
                placeholder="지역명을 검색하세요."
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

            <p
              className={
                statusMessage
                  ? `pointer-events-none mt-1.5 text-xs ${statusMessage.tone === "error" ? "text-destructive" : "text-primary"}`
                  : "pointer-events-none mt-1.5 text-xs text-muted-foreground"
              }
            >
              {statusMessage?.text ??
                (pending ? "지도에서 직접 눌러 위치를 조정할 수 있어요" : "지도를 클릭(탭)하면 임시 마커가 표시돼요")}
            </p>
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
