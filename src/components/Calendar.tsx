"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTodayDateString, toDateKey } from "@/lib/date";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

type CalendarProps = {
  viewYear: number;
  viewMonth: number; // 0-indexed (JS Date 컨벤션)
  selectedDate: string | null;
  markedDates: Set<string>;
  onSelectDate: (dateKey: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
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
}: CalendarProps) {
  const cells = getMonthCells(viewYear, viewMonth);
  const today = getTodayDateString();

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
        <p className="text-sm font-semibold text-foreground">
          {viewYear}년 {viewMonth + 1}월
        </p>
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
    </div>
  );
}
