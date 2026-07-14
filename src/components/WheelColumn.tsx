"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type WheelColumnProps<T> = {
  items: T[];
  value: T;
  onChange: (value: T) => void;
  renderItem: (item: T) => string;
  ariaLabel: string;
  /** 한 칸의 높이(px). 기본값은 TimePicker에서 쓰던 값과 같습니다. */
  itemHeight?: number;
  /** 한 화면에 보이는 줄 수. 가운데 한 줄이 정확히 "선택된 값"이 되도록 항상 홀수여야 합니다. */
  visibleRows?: number;
};

/**
 * 휠 피커 한 칸(TimePicker에서 분리한 공용 컴포넌트). 세로 스크롤 + CSS scroll-snap으로
 * "가운데 칸이 곧 선택된 값"이 되도록 만듭니다. 위아래로 스크롤이 멈추면(디바운스) 그
 * 시점에 가운데에 온 항목을 실제 선택값으로 반영하고, 혹시 snap이 딱 안 맞았을 경우를
 * 대비해 정확한 위치로 한 번 더 보정합니다.
 */
export default function WheelColumn<T>({
  items,
  value,
  onChange,
  renderItem,
  ariaLabel,
  itemHeight = 40,
  visibleRows = 5,
}: WheelColumnProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const height = itemHeight * visibleRows;
  const padding = ((visibleRows - 1) / 2) * itemHeight;

  // 시트가 열릴 때 현재 값 위치로 스크롤을 미리 맞춰둡니다(애니메이션 없이 즉시).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const index = items.indexOf(value);
    if (index === -1) return;
    container.scrollTop = index * itemHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const index = Math.max(0, Math.min(items.length - 1, Math.round(container.scrollTop / itemHeight)));
      container.scrollTo({ top: index * itemHeight, behavior: "smooth" });
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
      style={{ height, paddingTop: padding, paddingBottom: padding }}
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
          style={{ height: itemHeight }}
        >
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}
