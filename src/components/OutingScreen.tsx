"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OutingHeader from "@/components/OutingHeader";
import Map from "@/components/Map";
import ScheduleList from "@/components/ScheduleList";
import BottomSheet from "@/components/BottomSheet";
import ConfirmDialog from "@/components/ConfirmDialog";
import PlaceForm from "@/components/PlaceForm";
import SavedPlacesPicker from "@/components/SavedPlacesPicker";
import RoutinePickerSheet from "@/components/RoutinePickerSheet";
import RoutineApplyConflictDialog from "@/components/RoutineApplyConflictDialog";
import RoutineMenuButton from "@/components/RoutineMenuButton";
import SaveRoutineFlow from "@/components/SaveRoutineFlow";
import ScheduleStatusBar from "@/components/ScheduleStatusBar";
import Toast from "@/components/Toast";
import FavoriteToggleButton from "@/components/FavoriteToggleButton";
import FavoriteBookmarkButton from "@/components/FavoriteBookmarkButton";
import CategoryPickerSheet from "@/components/CategoryPickerSheet";
import FloatingButton from "@/components/FloatingButton";
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
import { TRANSPORT_LABELS } from "@/types/transport";
import { Bookmark, LocateFixed, Loader2, MapPin, Navigation } from "lucide-react";

type OutingScreenProps = {
  date: string;
};

// 화면 맨 아래에는 이제 ScheduleStatusBar(고정, 장소 추가 버튼 바로 아래)가 항상 깔려
// 있어서, + 버튼과 그 위 스크롤 영역 여백을 그 바 높이만큼 더 띄워야 합니다.
const STATUS_BAR_CLEARANCE = "calc(env(safe-area-inset-bottom) + 2.25rem)"; // ScheduleStatusBar 자신의 높이(h-9)
const FAB_BOTTOM_OFFSET = `calc(${STATUS_BAR_CLEARANCE} + 1rem)`; // 상태 바 위로 1rem 띄움
const SCROLL_BOTTOM_PADDING = `calc(${FAB_BOTTOM_OFFSET} + 4.5rem)`; // + 버튼 높이(3.5rem)+여유

export default function OutingScreen({ date }: OutingScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // "오늘 외출" 흐름(홈 → 오늘 외출)에서 들어왔는지 표시입니다. 실제 날짜가 오늘인지(isToday)와는
  // 다른 개념입니다 — 하루 전/다음으로 다른 날짜로 옮겨가도 이 흐름 표시는 유지되어야, 지정
  // 외출(캘린더)을 들렀다 돌아올 때 홈이 아니라 이 화면(보던 날짜 그대로)으로 돌아올 수 있습니다.
  const fromTodayFlow = searchParams.get("from") === "today";
  // 지정 외출 캘린더(날짜 선택 카드)의 "일정 보기"/"+ 새 외출 만들기"로 들어온 경우입니다.
  // 뒤로가기를 누르면 홈이 아니라 그 캘린더 화면(같은 날짜가 선택된 채)으로 돌아가야 합니다.
  const fromCalendarFlow = searchParams.get("from") === "calendar";
  const { places, setPlaces, setTitle, departureTime, transport, updatedAt, setDepartureInfo } = useOuting(date);
  const [, setFavorites] = useFavorites();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSavedPlacesOpen, setIsSavedPlacesOpen] = useState(false);
  const [isRoutinePickerOpen, setIsRoutinePickerOpen] = useState(false);
  const [isRoutineSaveOpen, setIsRoutineSaveOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [actionsFor, setActionsFor] = useState<Place | null>(null);
  // 삭제 버튼을 눌러도 바로 지우지 않고, 이 장소를 확인 모달에 담아뒀다가 확인을 눌러야
  // 실제로 지웁니다.
  const [deleteTarget, setDeleteTarget] = useState<Place | null>(null);
  // "장소 추가" 시트는 아직 저장되지 않은 장소를 다루기 때문에, 좌표로 즐겨찾기 여부를
  // 판단하는 FavoriteToggleButton(장소 수정용)과 같은 방식을 쓸 수 없습니다. 대신 "제출하면
  // 이 카테고리로 즐겨찾기에도 추가한다"는 의도만 여기서 들고 있다가, 실제 저장(handleAddPlace)
  // 시점에 확정된 이름/좌표로 즐겨찾기를 만듭니다.
  const [pendingFavoriteCategory, setPendingFavoriteCategory] = useState<string | null>(null);
  const [isAddCategoryPickerOpen, setIsAddCategoryPickerOpen] = useState(false);
  // 즐겨찾기에서 불러온 값으로 "장소 추가" 폼을 미리 채워둔 상태입니다 — 고르는 즉시
  // 일정에 추가되지 않고, 이 값으로 채워진 폼을 사용자가 확인/수정한 뒤 "추가하기"를
  // 눌러야 실제로 추가됩니다.
  const [favoriteDraft, setFavoriteDraft] = useState<Place | null>(null);
  // 이미 장소가 있는 날짜에 루틴을 적용하려 할 때, 바로 채우지 않고 이 값에 잠시 담아둔 뒤
  // RoutineApplyConflictDialog(추가/덮어쓰기/취소)에서 고른 방식대로 처리합니다.
  const [pendingRoutineApply, setPendingRoutineApply] = useState<{ name: string; places: Place[] } | null>(null);
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

  // 오늘 외출 흐름(fromTodayFlow)에서, "오늘" 날짜 화면을 열어둔 채로 자정을 넘기면 날짜가
  // 그대로 굳어버리지 않도록 최신 날짜로 이동합니다. 탭이 백그라운드에 있으면 setInterval이
  // 늦게 돌거나 아예 멈출 수 있어서, 탭이 다시 보이는 시점(visibilitychange)에도 확인합니다.
  //
  // 주의: 하루 전/다음(</> 버튼)으로 다른 날짜를 일부러 보고 있을 때는 절대 이 날짜를
  // "오늘로" 강제로 되돌리면 안 됩니다. date가 바뀔 때마다(=하루 전/다음으로 이동할 때마다)
  // 이 effect가 다시 실행되므로, 그 시점에 date가 실제로 "오늘"이었는지(wasTodayWhenLoaded)를
  // 딱 한 번만 확인해서 값으로 고정해둡니다 — 어제/내일처럼 오늘이 아닌 날짜로 이동한
  // 직후에는 이 값이 false가 되어 아래 주기적 확인 자체가 아예 걸리지 않고, 사용자가
  // 나중에 "오늘" 날짜로 돌아왔을 때만(effect가 다시 실행되며 재평가) 다시 걸립니다.
  useEffect(() => {
    if (!fromTodayFlow) return;

    const wasTodayWhenLoaded = date === getTodayDateString();
    if (!wasTodayWhenLoaded) return;

    const checkDateRollover = () => {
      const actualToday = getTodayDateString();
      if (actualToday !== date) {
        router.replace(`/outing/${actualToday}?from=today`);
      }
    };

    const interval = setInterval(checkDateRollover, 30_000);
    document.addEventListener("visibilitychange", checkDateRollover);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", checkDateRollover);
    };
  }, [fromTodayFlow, date, router]);

  // 방문 시간이 있으면 그 시간에 맞는 자리에 끼워 넣고, 없으면 맨 뒤에 붙입니다. 전체를
  // 다시 정렬하지 않으므로, 드래그로 바꿔둔 다른 카드들의 순서는 그대로 유지됩니다.
  const handleAddPlace = (place: Place) => {
    setPlaces((prev) => insertPlaceByTime(prev, place));
    // 추가 도중 별 아이콘으로 카테고리를 골라뒀다면, 방금 확정된 이름/좌표로 즐겨찾기도 함께 만듭니다.
    if (pendingFavoriteCategory) {
      setFavorites((prev) => [
        ...prev,
        {
          id: generateId(),
          name: place.name,
          category: pendingFavoriteCategory,
          memo: place.memo,
          lat: place.lat,
          lng: place.lng,
        },
      ]);
      setPendingFavoriteCategory(null);
    }
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

  const requestDeletePlace = (id: string) => {
    const place = places.find((candidate) => candidate.id === id);
    if (place) setDeleteTarget(place);
  };

  const handleConfirmDeletePlace = () => {
    if (deleteTarget) {
      const id = deleteTarget.id;
      setPlaces((prev) => prev.filter((place) => place.id !== id));
      setSelectedId((current) => (current === id ? null : current));
    }
    setDeleteTarget(null);
  };

  const handlePickSavedPlace = (favorite: FavoritePlace) => {
    // 바로 일정에 추가하지 않고, "장소 추가" 폼으로 돌아가 이 값으로 미리 채운 채
    // 사용자가 확인/수정할 수 있게 합니다 — 실제 추가는 그 폼에서 "추가하기"를 눌러야 됩니다.
    setFavoriteDraft({
      id: generateId(),
      name: favorite.name,
      memo: favorite.memo,
      lat: favorite.lat,
      lng: favorite.lng,
    });
    setIsSavedPlacesOpen(false);
    setIsAddOpen(true);
  };

  // 루티 루틴의 장소를 오늘/지정 외출에 채워 넣습니다. 장소 id는 루틴 원본과 완전히
  // 독립되도록 새로 발급합니다(복제 일정과 동일한 방식). RoutinePickerSheet에서 이번
  // 일정에만 적용할 장소(제외 반영 완료)를 이미 골라 전달해 주므로 그대로 씁니다.
  // 이 날짜에 이미 장소가 있으면 바로 덮어쓰지 않고, 추가/덮어쓰기/취소를 먼저 물어봅니다.
  const handleLoadRoutine = (routineName: string, routinePlaces: Place[]) => {
    if (places.length > 0) {
      setPendingRoutineApply({ name: routineName, places: routinePlaces });
      return;
    }
    setPlaces(routinePlaces.map((place) => ({ ...place, id: generateId() })));
    setTitle(routineName);
    setIsRoutinePickerOpen(false);
  };

  const handleAppendRoutine = () => {
    if (!pendingRoutineApply) return;
    setPlaces((prev) => [...prev, ...pendingRoutineApply.places.map((place) => ({ ...place, id: generateId() }))]);
    setPendingRoutineApply(null);
    setIsRoutinePickerOpen(false);
  };

  const handleOverwriteRoutine = () => {
    if (!pendingRoutineApply) return;
    setPlaces(pendingRoutineApply.places.map((place) => ({ ...place, id: generateId() })));
    setTitle(pendingRoutineApply.name);
    setPendingRoutineApply(null);
    setIsRoutinePickerOpen(false);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2000);
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
      <OutingHeader
        date={date}
        isToday={isToday}
        places={places}
        fromTodayFlow={fromTodayFlow}
        fromCalendarFlow={fromCalendarFlow}
      />

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

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {places.length === 0 ? (
          // 일정이 없는 날짜는 목록 레이아웃 대신 전용 빈 상태 화면을 보여줍니다 — 이때
          // 할 수 있는 행동은 "새 외출 만들기"와 "루틴 불러오기" 둘뿐이므로, 같은 행동을
          // 중복 노출하는 우측 상단 버튼/우측 하단 FAB는 숨기고 가운데 버튼 2개로 모읍니다.
          <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ paddingBottom: STATUS_BAR_CLEARANCE }}>
            {/* min-h-full은 바닥값일 뿐이라 내용이 넘칠 때 잘리지 않고 그대로 스크롤되지만,
                내용이 짧을 때는(대부분의 화면 높이) 이 영역(지도 아래 ~ 하단 상태 바 위,
                paddingBottom으로 이미 그 경계까지만 확보됨) 전체를 기준으로 EmptyState
                그룹 전체가 정확히 세로 한가운데에 오도록 합니다. */}
            <div className="flex min-h-full flex-col items-center justify-center">
              <EmptyState
                onCreateNew={() => {
                  setPendingFavoriteCategory(null);
                  setFavoriteDraft(null);
                  setIsAddOpen(true);
                }}
                onLoadRoutine={() => setIsRoutinePickerOpen(true)}
              />
            </div>
          </div>
        ) : (
          <>
            {/* '일정' 제목/안내 문구는 카드 목록과 별개의 고정 영역입니다 — 카드 목록만
                스크롤되는 아래쪽 div 안에 있지 않아서, 카드를 드래그하거나 목록을 스크롤해도
                이 영역은 함께 움직이지 않습니다. */}
            <div className="shrink-0 px-4 pt-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">일정</h2>
                <RoutineMenuButton onSave={() => setIsRoutineSaveOpen(true)} onLoad={() => setIsRoutinePickerOpen(true)} />
              </div>
              {(departureTime || transport) && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {departureTime && `출발 ${departureTime}`}
                  {departureTime && transport && " · "}
                  {transport && TRANSPORT_LABELS[transport]}
                </p>
              )}
              {places.length >= 2 && (
                <p className="mt-0.5 text-[11px] text-[#999]">카드를 드래그하여 순서를 변경해보세요.</p>
              )}
            </div>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto px-3 pt-2"
              style={{ paddingBottom: SCROLL_BOTTOM_PADDING }}
            >
              <ScheduleList
                places={places}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onShowActions={setActionsFor}
                onEdit={setEditingPlace}
                onDelete={requestDeletePlace}
                onReorder={setPlaces}
              />
            </div>
          </>
        )}
      </div>

      {places.length > 0 && (
        <FloatingButton
          bottomOffset={FAB_BOTTOM_OFFSET}
          onClick={() => {
            setPendingFavoriteCategory(null);
            setFavoriteDraft(null);
            setIsAddOpen(true);
          }}
        />
      )}
      <ScheduleStatusBar placeCount={places.length} updatedAt={updatedAt} />

      <BottomSheet
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPendingFavoriteCategory(null);
            setFavoriteDraft(null);
          }
          setIsAddOpen(open);
        }}
        title="장소 추가"
        titleAction={
          <FavoriteBookmarkButton
            filled={pendingFavoriteCategory !== null}
            onClick={() => {
              if (pendingFavoriteCategory !== null) {
                setPendingFavoriteCategory(null);
                return;
              }
              setIsAddCategoryPickerOpen(true);
            }}
            ariaLabel={pendingFavoriteCategory !== null ? "즐겨찾기 예약 취소" : "저장할 때 즐겨찾기로도 등록"}
          />
        }
      >
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setPendingFavoriteCategory(null);
              setFavoriteDraft(null);
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
            key={favoriteDraft?.id ?? "manual"}
            initialValue={favoriteDraft ?? undefined}
            existingPlaces={places}
            isToday={isToday}
            onCancel={() => {
              setPendingFavoriteCategory(null);
              setFavoriteDraft(null);
              setIsAddOpen(false);
            }}
            onSubmit={handleAddPlace}
            submitLabel="추가하기"
          />
        </div>
      </BottomSheet>

      <CategoryPickerSheet
        open={isAddCategoryPickerOpen}
        onOpenChange={setIsAddCategoryPickerOpen}
        initialCategory={pendingFavoriteCategory}
        onConfirm={setPendingFavoriteCategory}
      />

      <SavedPlacesPicker
        open={isSavedPlacesOpen}
        onOpenChange={setIsSavedPlacesOpen}
        onBack={() => {
          setIsSavedPlacesOpen(false);
          setIsAddOpen(true);
        }}
        onPick={handlePickSavedPlace}
      />

      <RoutinePickerSheet
        open={isRoutinePickerOpen}
        onOpenChange={setIsRoutinePickerOpen}
        onPick={handleLoadRoutine}
      />

      <RoutineApplyConflictDialog
        open={pendingRoutineApply !== null}
        onOpenChange={(next) => {
          if (!next) setPendingRoutineApply(null);
        }}
        onAppend={handleAppendRoutine}
        onOverwrite={handleOverwriteRoutine}
      />

      <SaveRoutineFlow
        open={isRoutineSaveOpen}
        onOpenChange={setIsRoutineSaveOpen}
        places={places}
        onSaved={showToast}
      />

      <BottomSheet
        open={editingPlace !== null}
        onOpenChange={(open) => !open && setEditingPlace(null)}
        title="장소 수정"
        titleAction={editingPlace && <FavoriteToggleButton place={editingPlace} />}
      >
        {editingPlace && (
          <PlaceForm
            initialValue={editingPlace}
            existingPlaces={places}
            isToday={isToday}
            onCancel={() => setEditingPlace(null)}
            onSubmit={handleEditPlace}
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="장소를 삭제할까요?"
        description={<>&ldquo;{deleteTarget?.name}&rdquo; 장소를 삭제하면 되돌릴 수 없습니다.</>}
        onConfirm={handleConfirmDeletePlace}
      />

      <Toast message={toastMessage} />
    </div>
  );
}
