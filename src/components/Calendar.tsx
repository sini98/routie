"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { getTodayDateString, toDateKey } from "@/lib/date";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
// 달력을 몇 번씩 넘기지 않고도 먼 과거/미래 연도로 바로 이동할 수 있도록, 현재 보고 있는
// 연도와 오늘 연도 양쪽에서 20년씩 여유를 둔 범위를 보여줍니다(둘 중 어느 쪽이든 이 범위
// 안에 항상 포함되도록 최소/최대 기준으로 계산합니다).
const YEAR_PICKER_PADDING = 20;

type CalendarProps = {
  viewYear: number;
  viewMonth: number; // 0-indexed (JS Date 컨벤션)
  selectedDate: string | null;
  markedDates: Set<string>;
  onSelectDate: (dateKey: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectYear: (year: number) => void;
};

function getMonthCells(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ day: number; dateKey: string } | null> = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, dateKey: toDateKey(new Date(year, month, day)) });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function Calendar({
  viewYear,
  viewMonth,
  selectedDate,
  markedDates,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onSelectYear,
}: CalendarProps) {
  const cells = getMonthCells(viewYear, viewMonth);
  const today = getTodayDateString();
  const todayYear = Number(today.slice(0, 4));

  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const selectedYearRef = useRef<HTMLButtonElement | null>(null);

  // viewYear·todayYear 둘 중 무엇이든 항상 목록 안에 들어오도록 범위를 계산합니다 —
  // 그래야 사용자가 이미 먼 연도를 보고 있는 상태에서 다시 열어도 목록이 잘리지 않습니다.
  const rangeStart = Math.min(viewYear, todayYear) - YEAR_PICKER_PADDING;
  const rangeEnd = Math.max(viewYear, todayYear) + YEAR_PICKER_PADDING;
  const years = Array.from({ length: rangeEnd - rangeStart + 1 }, (_, index) => rangeStart + index);

  // 시트를 열 때마다 현재 보고 있는 연도가 바로 화면 중앙에 보이도록 스크롤합니다.
  useEffect(() => {
    if (!isYearPickerOpen) return;
    selectedYearRef.current?.scrollIntoView({ block: "center" });
  }, [isYearPickerOpen]);

  const handleSelectYear = (year: number) => {
    onSelectYear(year);
    setIsYearPickerOpen(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="이전 달"
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setIsYearPickerOpen(true)}
          aria-label="연도 선택"
          className="rounded-md px-2 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-muted active:scale-95"
        >
          {viewYear}년 {viewMonth + 1}월
        </button>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="다음 달"
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        ))}

        {cells.map((cell, index) => {
          if (!cell) return <span key={`empty-${index}`} />;

          const isSelected = cell.dateKey === selectedDate;
          const isToday = cell.dateKey === today;
          const isMarked = markedDates.has(cell.dateKey);

          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => onSelectDate(cell.dateKey)}
              className="flex flex-col items-center justify-center gap-0.5 py-1"
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors",
                  isSelected
                    ? "bg-primary font-semibold text-primary-foreground"
                    : isToday
                      ? "border border-primary text-primary"
                      : "text-foreground hover:bg-muted"
                )}
              >
                {cell.day}
              </span>
              <span className={cn("h-1 w-1 rounded-full", isMarked ? "bg-primary" : "bg-transparent")} />
            </button>
          );
        })}
      </div>

      <BottomSheet open={isYearPickerOpen} onOpenChange={setIsYearPickerOpen} title="연도 선택">
        <div className="grid max-h-[55vh] grid-cols-4 gap-2 overflow-y-auto">
          {years.map((year) => {
            const isSelectedYear = year === viewYear;
            const isCurrentYear = year === todayYear;
            return (
              <button
                key={year}
                type="button"
                ref={isSelectedYear ? selectedYearRef : undefined}
                onClick={() => handleSelectYear(year)}
                className={cn(
                  "flex h-11 items-center justify-center rounded-lg text-sm transition-colors",
                  isSelectedYear
                    ? "bg-primary font-semibold text-primary-foreground"
                    : isCurrentYear
                      ? "border border-primary text-primary"
                      : "text-foreground hover:bg-muted"
                )}
              >
                {year}년
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}
