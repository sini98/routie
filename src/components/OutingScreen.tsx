"use client";

import { useEffect, useRef, useState } from "react";
import OutingHeader from "@/components/OutingHeader";
import Map from "@/components/Map";
import ScheduleList from "@/components/ScheduleList";
import BottomSheet from "@/components/BottomSheet";
import PlaceForm from "@/components/PlaceForm";
import SavedPlacesPicker from "@/components/SavedPlacesPicker";
import FloatingButton from "@/components/FloatingButton";
import SaveStatusIndicator from "@/components/SaveStatusIndicator";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useOuting } from "@/hooks/useOutings";
import { useFavorites } from "@/hooks/useFavorites";
import { useAutoLocate } from "@/hooks/useAutoLocate";
import { getTodayDateString } from "@/lib/date";
import { getNaverDirectionsUrl } from "@/lib/naver";
import { generateId } from "@/lib/id";
import { insertPlaceByTime } from "@/lib/scheduleOrder";
import { Place } from "@/types/place";
import { FavoritePlace } from "@/types/favorite";
import { Bookmark, LocateFixed, Loader2, MapPin, Navigation } from "lucide-react";

type OutingScreenProps = {
  date: string;
};

export default function OutingScreen({ date }: OutingScreenProps) {
  const { places, setPlaces, title, setTitle } = useOuting(date);
  const [, setFavorites] = useFavorites();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSavedPlacesOpen, setIsSavedPlacesOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [actionsFor, setActionsFor] = useState<Place | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isToday = date === getTodayDateString();
  // 오늘 외출 + 장소가 하나도 없을 때만 "현재 위치로 빠르게 시작" 대상입니다.
  // 이미 장소가 있는 일정(지정 외출 포함)은 절대 현재 위치로 덮어쓰지 않습니다.
  const isTodayEmpty = isToday && places.length === 0;
  const {
    status: locateStatus,
    currentLocation,
    requestNow: requestCurrentLocation,
  } = useAutoLocate(isTodayEmpty);

  // 디버깅용: "오늘 외출"에 실제로 어떤 장소가 몇 개 저장돼 있는지, isToday/locateStatus가
  // 어떻게 계산됐는지 콘솔에서 바로 확인할 수 있습니다. 저장된 장소가 없어야 할 화면인데
  // 장소가 남아있다면(예: 예전 테스트에서 추가한 장소), 그게 지도가 저장된 위치를 우선하는
  // 진짜 원인입니다.
  useEffect(() => {
    console.log("[Routie][Debug][OutingScreen] 상태 확인", {
      date,
      isToday,
      placesLength: places.length,
      places: places.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng })),
      locateStatus,
      currentLocation,
      autoLocateEnabled: isTodayEmpty,
    });
  }, [date, isToday, places, locateStatus, currentLocation, isTodayEmpty]);

  // 방문 시간이 있으면 그 시간에 맞는 자리에 끼워 넣고, 없으면 맨 뒤에 붙입니다. 전체를
  // 다시 정렬하지 않으므로, 드래그로 바꿔둔 다른 카드들의 순서는 그대로 유지됩니다.
  const handleAddPlace = (place: Place) => {
    setPlaces((prev) => insertPlaceByTime(prev, place));
    setIsAddOpen(false);
    setSelectedId(place.id);
  };

  const handleEditPlace = (updated: Place) => {
    setPlaces((prev) => {
      const original = prev.find((place) => place.id === updated.id);
      if (!original || original.time === updated.time) {
        // 시간이 안 바뀌었으면 자리는 그대로 두고 내용만 바꿉니다 — 시간이 같은 다른
        // 카드들과의 순서를 괜히 흔들지 않기 위해서입니다.
        return prev.map((place) => (place.id === updated.id ? updated : place));
      }
      // 시간이 바뀌었으면 원래 자리에서 빼고, 새 시간 기준으로 다시 끼워 넣습니다.
      const withoutPlace = prev.filter((place) => place.id !== updated.id);
      return insertPlaceByTime(withoutPlace, updated);
    });
    setEditingPlace(null);
  };

  const handleDelete = (id: string) => {
    setPlaces((prev) => prev.filter((place) => place.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  };

  const handleSaveAsFavorite = (favorite: FavoritePlace) => {
    setFavorites((prev) => [...prev, favorite]);
  };

  const handlePickSavedPlace = (favorite: FavoritePlace) => {
    handleAddPlace({
      id: generateId(),
      name: favorite.name,
      memo: favorite.memo,
      lat: favorite.lat,
      lng: favorite.lng,
    });
    setIsSavedPlacesOpen(false);
  };

  const handleViewOnMap = () => {
    if (actionsFor) setSelectedId(actionsFor.id);
    setActionsFor(null);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenDirections = () => {
    if (actionsFor) window.open(getNaverDirectionsUrl(actionsFor), "_blank", "noopener,noreferrer");
    setActionsFor(null);
  };

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-background">
      <OutingHeader date={date} isToday={isToday} title={title} onRenameTitle={setTitle} />

      <div className="relative isolate z-0 h-[42vh] min-h-[220px] w-full shrink-0 overflow-hidden bg-accent max-[390px]:h-[36vh] max-[390px]:min-h-[190px]">
        {isTodayEmpty && locateStatus === "needs-permission" ? (
          <button
            type="button"
            onClick={requestCurrentLocation}
            className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-white"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            현재 위치로 시작하기
          </button>
        ) : isTodayEmpty && locateStatus === "located" ? (
          // 현재 위치는 GPS/Wi-Fi 오차로 몇백 미터 어긋날 수 있는 "시작점" 힌트일 뿐이라,
          // 정확한 위치는 지도에서 직접 조정해야 한다는 걸 매번 명확히 안내합니다.
          <p className="absolute left-1/2 top-3 z-10 w-[85%] max-w-xs -translate-x-1/2 rounded-xl bg-white/90 px-3 py-1.5 text-center text-xs font-medium text-muted-foreground shadow-sm">
            현재 위치를 기준으로 지도를 불러왔어요. 정확한 위치는 지도에서 조정해 주세요.
          </p>
        ) : isTodayEmpty && locateStatus === "checking" ? (
          // 예전에는 이 상태일 때 지도를 불투명 오버레이로 완전히 가려서, 위치 조회(최대
          // 8초 x 2단계)가 끝날 때까지 화면이 "멈춘 것처럼" 보였습니다. 지금은 지도를 곧바로
          // 보여주고(서울 기본값 등으로 시작) 이 작은 배지만 얹어서, 위치가 나중에 도착하면
          // 지도가 부드럽게(panTo) 실제 위치로 옮겨갑니다 — 체감상 화면이 훨씬 빨리 반응합니다.
          <p className="absolute left-1/2 top-3 z-10 flex items-center gap-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Loader2 className="h-3 w-3 animate-spin" />
            현재 위치를 확인하는 중...
          </p>
        ) : (
          <p className="absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            지도에서 방문 순서를 확인해보세요
          </p>
        )}

        {/* 지도 자체(및 네이버 지도 SDK 스크립트 로딩)는 위치 조회와 상관없이 항상 마운트해
            둡니다 — 그래야 스크립트 로딩과 위치 조회가 동시에 진행돼 체감 속도가 빨라집니다.
            위치 조회 중이라고 지도를 가리지 않고 바로 보여줍니다(위 배지만으로 안내) —
            오늘 외출 + 장소 0개일 때는 currentLocationOnly를 넘겨 NaverMap이 defaultRegion
            (지정 외출에서 검색해둔 지역 등)을 완전히 무시하고 현재 위치(또는 실패 시 서울)만
            쓰도록 합니다. */}
        <Map
          places={places}
          selectedId={selectedId}
          onSelectPlace={setSelectedId}
          currentLocationOnly={isTodayEmpty ? currentLocation : undefined}
        />
      </div>

      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto"
        style={{ paddingBottom: "max(5rem, calc(env(safe-area-inset-bottom) + 4.5rem))" }}
      >
        {places.length === 0 ? (
          <EmptyState />
        ) : (
          <ScheduleList
            places={places}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onShowActions={setActionsFor}
            onEdit={setEditingPlace}
            onDelete={handleDelete}
            onReorder={setPlaces}
          />
        )}
      </div>

      <SaveStatusIndicator />
      <FloatingButton onClick={() => setIsAddOpen(true)} />

      <BottomSheet open={isAddOpen} onOpenChange={setIsAddOpen} title="장소 추가">
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setIsAddOpen(false);
              setIsSavedPlacesOpen(true);
            }}
          >
            <Bookmark className="h-4 w-4" />
            저장한 장소 불러오기
          </Button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            또는 새로 입력
            <span className="h-px flex-1 bg-border" />
          </div>

          <PlaceForm
            existingPlaces={places}
            isToday={isToday}
            onCancel={() => setIsAddOpen(false)}
            onSubmit={handleAddPlace}
            onSaveAsFavorite={handleSaveAsFavorite}
          />
        </div>
      </BottomSheet>

      <SavedPlacesPicker open={isSavedPlacesOpen} onOpenChange={setIsSavedPlacesOpen} onPick={handlePickSavedPlace} />

      <BottomSheet
        open={editingPlace !== null}
        onOpenChange={(open) => !open && setEditingPlace(null)}
        title="장소 수정"
      >
        {editingPlace && (
          <PlaceForm
            initialValue={editingPlace}
            existingPlaces={places}
            isToday={isToday}
            onCancel={() => setEditingPlace(null)}
            onSubmit={handleEditPlace}
            onSaveAsFavorite={handleSaveAsFavorite}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={actionsFor !== null}
        onOpenChange={(open) => !open && setActionsFor(null)}
        title={actionsFor?.name ?? ""}
      >
        <div className="flex flex-col gap-2 pb-1">
          <Button type="button" variant="outline" className="justify-start" onClick={handleViewOnMap}>
            <MapPin className="h-4 w-4" />
            지도에서 보기
          </Button>
          <Button type="button" variant="outline" className="justify-start" onClick={handleOpenDirections}>
            <Navigation className="h-4 w-4" />
            네이버지도에서 길찾기
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
