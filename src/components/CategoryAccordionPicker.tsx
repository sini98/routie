"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";

type CategoryAccordionPickerProps = {
  value: string;
  onChange: (category: string) => void;
};

/**
 * "즐겨찾기 추가" 화면의 카테고리 선택 UI입니다. 기존 작은 "기타⌄" 칩 버튼의 위치/크기는
 * 그대로 두고, 누르면 그 버튼 바로 아래로 비슷한 폭의 작은 드롭다운이 이어져 뜹니다(화면
 * 전체 레이아웃을 밀어내지 않도록 absolute 오버레이). 카테고리가 많으면 이 드롭다운 안에서만
 * 세로 스크롤됩니다. 바깥을 누르면 닫힙니다(RoutineMenuButton과 같은 pointerdown 패턴).
 */
export default function CategoryAccordionPicker({ value, onChange }: CategoryAccordionPickerProps) {
  const { categories } = useCategories();
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isExpanded) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isExpanded]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-label="카테고리 선택"
        aria-expanded={isExpanded}
        className="flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
      >
        {value}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
      </button>

      {isExpanded && (
        <div className="absolute right-0 top-full z-20 mt-1 max-h-40 w-28 overflow-y-auto rounded-lg border border-border bg-white p-1 shadow-md">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                onChange(category);
                setIsExpanded(false);
              }}
              className={cn(
                "block w-full truncate rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                category === value
                  ? "bg-primary font-medium text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
