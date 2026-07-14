"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, FolderOutput } from "lucide-react";
import Calendar from "@/components/Calendar";
import RoutinePickerSheet from "@/components/RoutinePickerSheet";
import RoutineApplyConflictDialog from "@/components/RoutineApplyConflictDialog";
import WeatherBadge from "@/components/WeatherBadge";
import { Button } from "@/components/ui/button";
import { useOuting, useOutingsMap } from "@/hooks/useOutings";
import { formatDateLabel, getTodayDateString } from "@/lib/date";
import { generateId } from "@/lib/id";
import { getOrderBadge } from "@/lib/order";
import { Place } from "@/types/place";

function CalendarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 오늘 외출 화면의 달력 아이콘에서 들어온 경우(?from=today)에는 뒤로가기가 메인이 아니라
  // 그 오늘 외출 화면으로 돌아갑니다. 메인에서 바로 들어왔거나 이 값이 없으면 기존처럼 메인으로.
  const cameFromToday = searchParams.get("from") === "today";
  // 오늘 외출 화면에서 하루 전/다음으로 다른 날짜를 보고 있다가 들어온 경우, 뒤로가기는
  // 실제 오늘 날짜가 아니라 그때 보고 있던 바로 그 날짜로 돌아가야 합니다.
  const returnDate = searchParams.get("returnDate");
  const [outings] = useOutingsMap();
  // 일정 보기(상세 화면)에서 뒤로가기로 돌아왔을 때 보고 있던 날짜 그대로 복귀시키기 위해,
  // 그 화면으로 이동할 때 함께 넘긴 date 쿼리를 초기값으로 씁니다. 없으면(캘린더에 처음
  // 들어온 경우) 기존처럼 오늘 날짜부터 시작합니다.
  const initialDate = searchParams.get("date") ?? getTodayDateString();
  const [viewYear, setViewYear] = useState(() => Number(initialDate.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(initialDate.slice(5, 7)) - 1);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  const markedDates = useMemo(
    () => new Set(Object.keys(outings).filter((key) => (outings[key]?.places ?? []).length > 0)),
    [outings]
  );

  // 선택한 날짜의 장소/제목은 useOuting으로 다뤄, 오늘 외출/지정 외출 상세 화면과 완전히
  // 같은 저장·루틴 적용 로직(setPlaces/setTitle)을 이 캘린더 미리보기 카드에서도 그대로 씁니다.
  const { places: selectedPlaces, setPlaces: setSelectedPlaces, setTitle: setSelectedTitle } =
    useOuting(selectedDate);
  const hasOuting = selectedPlaces.length > 0;
  const isSelectedToday = selectedDate === getTodayDateString();
  // 과거 날짜는 날씨를 표시하지 않습니다(오늘 외출 헤더와 동일한 규칙).
  const isSelectedPast = selectedDate < getTodayDateString();
  const scheduleLocation =
    selectedPlaces.length > 0 ? { lat: selectedPlaces[0].lat, lng: selectedPlaces[0].lng } : undefined;

  const [isRoutinePickerOpen, setIsRoutinePickerOpen] = useState(false);
  // 이미 장소가 있는 날짜에 루틴을 적용하려 할 때, 바로 채우지 않고 이 값에 잠시 담아둔 뒤
  // RoutineApplyConflictDialog(추가/덮어쓰기/취소)에서 고른 방식대로 처리합니다 — 오늘 외출
  // 상세 화면(OutingScreen)과 동일한 흐름입니다.
  const [pendingRoutineApply, setPendingRoutineApply] = useState<{ name: string; places: Place[] } | null>(null);

  const handleLoadRoutine = (routineName: string, routinePlaces: Place[]) => {
    if (selectedPlaces.length > 0) {
      setPendingRoutineApply({ name: routineName, places: routinePlaces });
      return;
    }
    setSelectedPlaces(routinePlaces.map((place) => ({ ...place, id: generateId() })));
    setSelectedTitle(routineName);
    setIsRoutinePickerOpen(false);
  };

  const handleAppendRoutine = () => {
    if (!pendingRoutineApply) return;
    setSelectedPlaces((prev) => [...prev, ...pendingRoutineApply.places.map((place) => ({ ...place, id: generateId() }))]);
    setPendingRoutineApply(null);
    setIsRoutinePickerOpen(false);
  };

  const handleOverwriteRoutine = () => {
    if (!pendingRoutineApply) return;
    setSelectedPlaces(pendingRoutineApply.places.map((place) => ({ ...place, id: generateId() })));
    setSelectedTitle(pendingRoutineApply.name);
    setPendingRoutineApply(null);
    setIsRoutinePickerOpen(false);
  };

  const handlePrevMonth = () => {
    const next = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleNextMonth = () => {
    const next = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  // 연도만 바꾸고 보고 있던 월은 그대로 유지합니다.
  const handleSelectYear = (year: number) => {
    setViewYear(year);
  };

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-background">
      <header
        className="flex shrink-0 items-center gap-2 border-b border-border bg-background px-3 pb-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={() =>
            router.push(cameFromToday ? `/outing/${returnDate ?? getTodayDateString()}?from=today` : "/")
          }
          aria-label={cameFromToday ? "오늘 외출로 돌아가기" : "홈으로"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-foreground">지정 외출</h1>
          <p className="text-xs text-muted-foreground">날짜를 선택해서 외출 일정을 만들어요</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Calendar
          viewYear={viewYear}
          viewMonth={viewMonth}
          selectedDate={selectedDate}
          markedDates={markedDates}
          onSelectDate={setSelectedDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onSelectYear={handleSelectYear}
        />

        <div className="mt-4 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="shrink-0 text-sm font-semibold text-foreground">{formatDateLabel(selectedDate)}</p>
              {!isSelectedPast && (
                <WeatherBadge date={selectedDate} isToday={isSelectedToday} scheduleLocation={scheduleLocation} compact />
              )}
            </div>
            {/* 캘린더 화면은 루틴을 이 날짜에 바로 채워 넣는 용도만 필요합니다 — 저장은 이미
                일정 보기(상세 화면)에 있으므로, 폴더 메뉴 대신 불러오기로 바로 가는 버튼
                하나만 둡니다(메뉴 한 단계를 없앱니다). 이 화면의 메인 액션은 "일정 보기"이므로,
                이 버튼은 회색 톤의 보조 버튼(secondary)으로 시각적 우선순위를 낮춥니다. */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 whitespace-nowrap border-border bg-white text-muted-foreground hover:bg-muted"
              onClick={() => setIsRoutinePickerOpen(true)}
            >
              <FolderOutput className="h-4 w-4 text-muted-foreground" />
              루틴 불러오기
            </Button>
          </div>

          {hasOuting ? (
            // 루티는 방문 순서가 중요한 서비스라, 장소가 많아도 "외 N곳"으로 숨기지 않고
            // 전부 순서대로 보여줍니다. 카드가 한없이 길어지지 않도록 대략 5~6개 높이(224px)
            // 까지만 자라고, 그 이상은 이 목록 안에서만 세로 스크롤됩니다.
            <ul className="mb-4 flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
              {selectedPlaces.map((place, index) => (
                <li key={place.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
                    {getOrderBadge(index)}
                  </span>
                  {place.time && <span className="text-xs">{place.time}</span>}
                  <span className="truncate text-foreground">{place.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">예정된 외출이 없어요</p>
          )}

          <Button
            type="button"
            className="w-full"
            onClick={() => router.push(`/outing/${selectedDate}?from=calendar`)}
          >
            {hasOuting ? "일정 보기" : "+ 새 외출 만들기"}
          </Button>
        </div>
      </div>

      <RoutinePickerSheet open={isRoutinePickerOpen} onOpenChange={setIsRoutinePickerOpen} onPick={handleLoadRoutine} />

      <RoutineApplyConflictDialog
        open={pendingRoutineApply !== null}
        onOpenChange={(next) => {
          if (!next) setPendingRoutineApply(null);
        }}
        onAppend={handleAppendRoutine}
        onOverwrite={handleOverwriteRoutine}
      />
    </div>
  );
}

// useSearchParams()를 쓰는 CalendarContent는 Next.js가 빌드 시 이 페이지를 정적으로
// prerender하려고 시도할 때 Suspense 경계 없이는 실패합니다(Vercel 빌드 오류: "useSearchParams()
// should be wrapped in a suspense boundary"). fallback은 아래 CalendarContent와 배경색만
// 맞춰서, 실제로 걸리더라도(대부분 즉시 지나감) 화면이 하얗게 번쩍이지 않게 합니다.
export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-background" />}>
      <CalendarContent />
    </Suspense>
  );
}
