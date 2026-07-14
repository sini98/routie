"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, Trash2 } from "lucide-react";
import { RoutieRoutine } from "@/types/routine";
import { cn } from "@/lib/utils";

type RoutineCardProps = {
  routine: RoutieRoutine;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
};

/**
 * 루티 루틴 목록의 카드 하나입니다. 카드(이름 영역)를 누르면 상세 화면으로 들어가고,
 * 길게 눌러 드래그하면 순서를 바꿀 수 있습니다(dnd-kit useSortable) — 즐겨찾기 카테고리
 * 카드(CategoryGroupCard)와 같은 패턴으로, 드래그 판정(activationConstraint)이 짧은
 * 탭과 드래그를 구분해줘서 상세 진입과 충돌하지 않습니다. 연필(이름 수정)/삭제 버튼은
 * 별도 형제 버튼이라 드래그 리스너가 걸려 있지 않습니다. 카드 자체가 이미 상세 진입
 * 역할을 하므로 별도의 ">" 아이콘은 두지 않습니다.
 */
export default function RoutineCard({ routine, onOpen, onRename, onDelete }: RoutineCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: routine.id,
  });

  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={dndStyle}
      className={cn(
        "flex items-center gap-1 rounded-lg border border-border bg-card p-1.5 transition-shadow",
        isDragging ? "relative z-10 shadow-xl" : "shadow-sm"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        {...attributes}
        {...listeners}
        aria-label={`${routine.name} 루틴, 길게 눌러 드래그하면 순서를 바꿀 수 있어요`}
        className="flex min-w-0 flex-1 touch-manipulation cursor-grab items-center gap-2 rounded-md p-2.5 text-left active:cursor-grabbing"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{routine.name}</span>
          <span className="block text-xs text-muted-foreground">장소 {routine.places.length}곳</span>
        </span>
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRename();
        }}
        aria-label={`${routine.name} 이름 수정`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
      >
        <Pencil className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        aria-label={`${routine.name} 삭제`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
