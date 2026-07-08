"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Calendar from "@/components/Calendar";
import RegionSearch from "@/components/RegionSearch";
import { Button } from "@/components/ui/button";
import { useOutingsMap } from "@/hooks/useOutings";
import { formatDateLabel, getTodayDateString } from "@/lib/date";
import { getOrderBadge } from "@/lib/order";

export default function CalendarPage() {
  const router = useRouter();
  const [outings] = useOutingsMap();
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  const markedDates = useMemo(
    () => new Set(Object.keys(outings).filter((key) => (outings[key]?.places ?? []).length > 0)),
    [outings]
  );

  const selectedPlaces = outings[selectedDate]?.places ?? [];
  const hasOuting = selectedPlaces.length > 0;

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
          onClick={() => router.push("/")}
          aria-label="홈으로"
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
          <p className="mb-3 text-sm font-semibold text-foreground">{formatDateLabel(selectedDate)}</p>

          {hasOuting ? (
            <ul className="mb-4 flex flex-col gap-1.5">
              {selectedPlaces.slice(0, 4).map((place, index) => (
                <li key={place.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
                    {getOrderBadge(index)}
                  </span>
                  {place.time && <span className="text-xs">{place.time}</span>}
                  <span className="truncate text-foreground">{place.name}</span>
                </li>
              ))}
              {selectedPlaces.length > 4 && (
                <li className="text-xs text-muted-foreground">외 {selectedPlaces.length - 4}곳</li>
              )}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">예정된 외출이 없어요</p>
          )}

          {!hasOuting && (
            <div className="mb-3">
              <p className="mb-1.5 text-xs text-muted-foreground">
                지역을 검색하면 그 위치를 기준으로 새 외출을 시작해요
              </p>
              <RegionSearch key={selectedDate} targetPath={`/outing/${selectedDate}`} />
            </div>
          )}

          <Button type="button" className="w-full" onClick={() => router.push(`/outing/${selectedDate}`)}>
            {hasOuting ? "일정 보기" : "+ 새 외출 만들기"}
          </Button>
        </div>
      </div>
    </div>
  );
}
