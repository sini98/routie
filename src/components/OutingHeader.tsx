"use client";

import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysToKey, formatDateLabel, getTodayDateString } from "@/lib/date";
import WeatherBadge from "@/components/WeatherBadge";
import { Place } from "@/types/place";

type OutingHeaderProps = {
  date: string;
  isToday: boolean;
  places: Place[];
  /** "오늘 외출" 흐름에서 들어왔는지 — 실제 날짜가 오늘인지(isToday)와는 별개입니다.
   * 하루 전/다음으로 다른 날짜로 옮겨가도 이 값은 유지되어, 캘린더로 갔다가 돌아올 때
   * 홈이 아니라 이 흐름(보던 날짜 그대로)으로 돌아올 수 있게 합니다. */
  fromTodayFlow: boolean;
  /** 지정 외출 캘린더의 "일정 보기"/"+ 새 외출 만들기"로 들어온 경우입니다. 뒤로가기를 누르면
   * 홈이 아니라 그 캘린더 화면(같은 날짜가 선택된 채)으로 돌아갑니다. */
  fromCalendarFlow: boolean;
};

export default function OutingHeader({ date, isToday, places, fromTodayFlow, fromCalendarFlow }: OutingHeaderProps) {
  const router = useRouter();
  // 지정 외출의 날씨는 그 일정의 첫 번째 장소(방문 순서상 맨 앞) 좌표를 기준으로 조회합니다.
  // 오늘 외출에서는 WeatherBadge가 GPS만 쓰므로 이 값이 쓰이지 않습니다.
  const scheduleLocation = places.length > 0 ? { lat: places[0].lat, lng: places[0].lng } : undefined;
  // 과거 날짜는 날씨를 아예 표시하지 않습니다(기상청 예보 자체가 지난 날짜를 제공하지 않으므로
  // "가져올 수 없습니다" 같은 에러 문구도 띄우지 않고, 날짜 아래 날씨 줄 자체를 비웁니다).
  const isPast = date < getTodayDateString();

  // 오늘 외출/지정 외출 캘린더 흐름에서 하루 전/다음으로 이동할 때는 각각의 from 표시를
  // 그대로 들고 갑니다 — 그래야 어느 날짜로 옮겨가든 뒤로가기가 원래 들어온 흐름으로
  // 정확히 복귀할 수 있습니다.
  const goToDate = (targetDate: string) => {
    if (fromTodayFlow) return router.push(`/outing/${targetDate}?from=today`);
    if (fromCalendarFlow) return router.push(`/outing/${targetDate}?from=calendar`);
    return router.push(`/outing/${targetDate}`);
  };

  return (
    <header
      className="flex shrink-0 items-center gap-1 border-b border-border bg-background px-2 pb-3"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <button
        type="button"
        onClick={() => router.push(fromCalendarFlow ? `/calendar?date=${date}` : "/")}
        aria-label={fromCalendarFlow ? "지정 외출로 돌아가기" : "홈으로"}
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
          {!isPast && <WeatherBadge date={date} isToday={isToday} scheduleLocation={scheduleLocation} />}
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
          // 오늘 외출 흐름(fromTodayFlow)에서 들어온 경우에만 from=today와 지금 보고 있던
          // 날짜(returnDate)를 함께 넘겨, 지정 외출 화면의 뒤로가기가 메인이 아니라 정확히
          // 이 날짜의 화면으로 돌아갈 수 있게 합니다(calendar/page.tsx의 뒤로가기 버튼 참고).
          // 지정 외출 쪽에서는 원래처럼 query 없이 이동해 뒤로가기가 메인으로 갑니다.
          onClick={() => router.push(fromTodayFlow ? `/calendar?from=today&returnDate=${date}` : "/calendar")}
          aria-label="지정 외출로 이동"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted active:scale-95"
        >
          <CalendarIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
