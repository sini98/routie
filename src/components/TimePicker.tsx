"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TimePickerProps = {
  /** 24시간제 "HH:MM" 문자열, 또는 아직 안 골랐으면 빈 문자열. */
  value: string;
  onChange: (value: string) => void;
};

type Period = "오전" | "오후";
type Draft = { period: Period; hour12: number; minute: number };

const PERIODS: Period[] = ["오전", "오후"];
const HOURS = Array.from({ length: 12 }, (_, index) => index + 1); // 1~12
const MINUTES = Array.from({ length: 60 }, (_, index) => index); // 0~59

// 각 휠의 한 칸 높이(px)와 한 화면에 보이는 줄 수. 줄 수는 가운데 한 줄이 정확히
// "선택된 값"이 되도록 항상 홀수여야 합니다.
const ITEM_HEIGHT = 40;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const PADDING = ((VISIBLE_ROWS - 1) / 2) * ITEM_HEIGHT;

function to24Hour(period: Period, hour12: number): number {
  if (period === "오전") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function toDraft(value: string): Draft {
  if (!value) return { period: "오전", hour12: 9, minute: 0 };
  const [hour24, minute] = value.split(":").map(Number);
  const period: Period = hour24 < 12 ? "오전" : "오후";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { period, hour12, minute };
}

function formatValue(value: string) {
  if (!value) return "";
  const { period, hour12, minute } = toDraft(value);
  return `${period} ${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

type WheelColumnProps<T> = {
  items: T[];
  value: T;
  onChange: (value: T) => void;
  renderItem: (item: T) => string;
  ariaLabel: string;
};

/**
 * 휠 피커 한 칸. 세로 스크롤 + CSS scroll-snap으로 "가운데 칸이 곧 선택된 값"이 되도록
 * 만듭니다. 위아래로 스크롤이 멈추면(디바운스) 그 시점에 가운데에 온 항목을 실제 선택값으로
 * 반영하고, 혹시 snap이 딱 안 맞았을 경우를 대비해 정확한 위치로 한 번 더 보정합니다.
 */
function WheelColumn<T>({ items, value, onChange, renderItem, ariaLabel }: WheelColumnProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 시트가 열릴 때 현재 값 위치로 스크롤을 미리 맞춰둡니다(애니메이션 없이 즉시).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const index = items.indexOf(value);
    if (index === -1) return;
    container.scrollTop = index * ITEM_HEIGHT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const index = Math.max(0, Math.min(items.length - 1, Math.round(container.scrollTop / ITEM_HEIGHT)));
      container.scrollTo({ top: index * ITEM_HEIGHT, behavior: "smooth" });
      const nextValue = items[index];
      if (nextValue !== value) onChange(nextValue);
    }, 100);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      role="listbox"
      aria-label={ariaLabel}
      className="flex-1 snap-y snap-mandatory overflow-y-scroll [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ height: WHEEL_HEIGHT, paddingTop: PADDING, paddingBottom: PADDING }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          role="option"
          aria-selected={item === value}
          className={cn(
            "flex snap-center items-center justify-center text-base transition-colors",
            item === value ? "font-semibold text-foreground" : "text-muted-foreground/50"
          )}
          style={{ height: ITEM_HEIGHT }}
        >
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}

/**
 * 방문 시간 선택 UI. 네이티브 <input type="time">은 오전/오후 순서나 선택된 항목의
 * 색상을 커스터마이즈할 수 없어서(브라우저/OS가 그리는 위젯이라 우리 CSS가 안 먹힘),
 * 오전/오후 · 시 · 분 세 칸을 각각 세로로 스크롤해서 고르는 휠 피커를 Bottom Sheet 안에
 * 직접 구현합니다.
 */
export default function TimePicker({ value, onChange }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(value));

  const openPicker = () => {
    setDraft(toDraft(value));
    setOpen(true);
  };

  const handleConfirm = () => {
    const hour24 = to24Hour(draft.period, draft.hour12);
    onChange(`${String(hour24).padStart(2, "0")}:${String(draft.minute).padStart(2, "0")}`);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <>
      <Button type="button" variant="outline" className="w-full justify-start" onClick={openPicker}>
        <Clock className="h-4 w-4" />
        {value ? formatValue(value) : "시간 선택"}
      </Button>

      <BottomSheet open={open} onOpenChange={setOpen} title="방문 시간 선택">
        <div className="flex flex-col gap-4 pb-1">
          <div className="relative">
            {/* 가운데 선택 칸을 표시하는 고정 하이라이트 밴드. 휠이 스크롤되는 동안에도
                이 밴드 자체는 움직이지 않고, 그 아래로 값들이 지나갑니다. */}
            <div
              className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 rounded-lg bg-accent"
              style={{ height: ITEM_HEIGHT }}
            />
            <div className="relative z-10 flex">
              <WheelColumn
                items={PERIODS}
                value={draft.period}
                onChange={(period) => setDraft((prev) => ({ ...prev, period }))}
                renderItem={(item) => item}
                ariaLabel="오전/오후"
              />
              <WheelColumn
                items={HOURS}
                value={draft.hour12}
                onChange={(hour12) => setDraft((prev) => ({ ...prev, hour12 }))}
                renderItem={(item) => String(item).padStart(2, "0")}
                ariaLabel="시"
              />
              <WheelColumn
                items={MINUTES}
                value={draft.minute}
                onChange={(minute) => setDraft((prev) => ({ ...prev, minute }))}
                renderItem={(item) => String(item).padStart(2, "0")}
                ariaLabel="분"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClear}>
              시간 선택 안 함
            </Button>
            <Button type="button" className="flex-1" onClick={handleConfirm}>
              확인
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
