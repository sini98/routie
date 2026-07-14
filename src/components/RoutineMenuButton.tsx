"use client";

import { useEffect, useRef, useState } from "react";
import { FolderInput, FolderOpen, FolderOutput } from "lucide-react";

type RoutineMenuButtonProps = {
  onSave: () => void;
  onLoad: () => void;
};

/** '일정' 제목 오른쪽의 폴더 아이콘 진입점 — 누르면 아이콘 위쪽에 하나의 카드 같은
 * 말풍선(Popover)이 뜨고, 상단에 "루티 루틴"이라는 작은 제목과 그 아래 구분선이 있어
 * 이 메뉴가 루티 루틴을 관리하는 메뉴임을 바로 알 수 있습니다. 제목 아래엔 불러오기/저장하기
 * 두 메뉴 항목이 가운데 세로 구분선(|) 하나로만 나뉘어 나란히 놓입니다(각각 독립된
 * 버튼처럼 보이지 않습니다). 바깥을 누르면 닫힙니다. */
export default function RoutineMenuButton({ onSave, onLoad }: RoutineMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="루틴 메뉴 열기"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
      >
        <FolderOpen className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-30 mb-1.5 flex flex-col rounded-lg border border-primary/15 bg-white p-1 shadow-md">
          <p className="px-2 pb-1.5 pt-1 text-sm font-bold text-foreground">루티 루틴</p>
          <div className="h-px w-full shrink-0 bg-border/50" />
          <div className="flex items-center gap-0 pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLoad();
              }}
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <FolderOutput className="h-4 w-4 shrink-0 text-muted-foreground" />
              불러오기
            </button>
            <div className="h-4 w-px shrink-0 bg-border" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSave();
              }}
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <FolderInput className="h-4 w-4 shrink-0 text-muted-foreground" />
              저장하기
            </button>
          </div>

          {/* 말풍선 꼬리 — 팝오버 아래쪽, 폴더 아이콘 쪽을 향하도록 배치합니다. */}
          <div className="absolute -bottom-[3px] right-3 h-1.5 w-1.5 rotate-45 border-b border-r border-primary/15 bg-white" />
        </div>
      )}
    </div>
  );
}
