"use client";

import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysToKey, formatDateLabel } from "@/lib/date";
import WeatherBadge from "@/components/WeatherBadge";
import { Place } from "@/types/place";

type OutingHeaderProps = {
  date: string;
  isToday: boolean;
  places: Place[];
};

export default function OutingHeader({ date, isToday, places }: OutingHeaderProps) {
  const router = useRouter();
  // 지정 외출의 날씨는 그 일정의 첫 번째 장소(방문 순서상 맨 앞) 좌표를 기준으로 조회합니다.
  // 오늘 외출에서는 WeatherBadge가 GPS만 쓰므로 이 값이 쓰이지 않습니다.
  const scheduleLocation = places.length > 0 ? { lat: places[0].lat, lng: places[0].lng } : undefined;

  const goToDate = (targetDate: string) => router.push(`/outing/${targetDate}`);

  return (
    <header
      className="flex shrink-0 items-center gap-1 border-b border-border bg-background px-2 pb-3"
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

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => goToDate(addDaysToKey(date, -1))}
          aria-label="하루 전"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-col items-center">
          <h1 className="truncate text-lg font-bold text-foreground">{formatDateLabel(date)}</h1>
          <WeatherBadge date={date} isToday={isToday} scheduleLocation={scheduleLocation} />
        </div>

        <button
          type="button"
          onClick={() => goToDate(addDaysToKey(date, 1))}
          aria-label="하루 다음"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* "오늘" 표시와 지정 외출(달력) 바로가기는 다시 서로 독립된 요소입니다 — 한 버튼으로
          합쳐뒀던 이전 버전과 달리, 지금은 각자 자기 자리와 스타일을 가진 별개의 액션입니다. */}
      <div className="flex shrink-0 items-center gap-1.5">
        {isToday && (
          <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
            오늘
          </span>
        )}
        <button
          type="button"
          // 오늘 외출 화면에서 들어온 경우에만 표시해, 지정 외출 화면의 뒤로가기가
          // 메인이 아니라 이 오늘 외출 화면(/today)으로 돌아갈 수 있게 합니다
          // (calendar/page.tsx의 뒤로가기 버튼 참고). 지정 외출 쪽 날짜에서는 원래처럼
          // query 없이 이동해 뒤로가기가 메인으로 갑니다.
          onClick={() => router.push(isToday ? "/calendar?from=today" : "/calendar")}
          aria-label="지정 외출로 이동"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted active:scale-95"
        >
          <CalendarIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
