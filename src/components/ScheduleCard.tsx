"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { Place } from "@/types/place";
import { getOrderBadge } from "@/lib/order";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ScheduleCardProps = {
  place: Place;
  order: number;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onShowActions: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

export default function ScheduleCard({
  place,
  order,
  isSelected,
  isFirst,
  isLast,
  onSelect,
  onShowActions,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ScheduleCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: place.id,
  });

  // dnd-kit이 관리하는 transform/transition은 이 래퍼(div)에만 적용하고,
  // Framer Motion의 hover/tap/layout 애니메이션은 안쪽 motion.div에서만 다뤄
  // 두 라이브러리가 같은 엘리먼트의 transform을 두고 충돌하지 않게 분리합니다.
  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={dndStyle} className={cn("relative", isDragging && "z-10")}>
      <motion.div
        layout
        onClick={onSelect}
        whileHover={{ scale: isDragging ? 1 : 1.01 }}
        whileTap={{ scale: 0.99 }}
        animate={{ scale: isDragging ? 1.03 : 1 }}
        // 드래그 시작/해제 피드백과 다른 카드가 비켜주는 layout 애니메이션 모두 이 transition을
        // 씁니다. 짧고(0.15s) 스프링이 아닌 easeOut으로 둬서 "잡자마자 바로 반응한다"는 느낌을
        // 주고, 놓았을 때 순서 변경도 굼뜨지 않게 합니다.
        transition={{ duration: 0.15, ease: "easeOut" }}
        {...attributes}
        {...listeners}
        aria-label={`${place.name} 카드, 길게 눌러 드래그하면 순서를 바꿀 수 있어요`}
        className={cn(
          "flex cursor-pointer touch-manipulation items-center gap-2.5 rounded-lg border bg-card p-3 transition-colors active:cursor-grabbing",
          isSelected ? "border-primary ring-2 ring-primary/30" : "border-border",
          isDragging ? "shadow-xl" : "shadow-sm"
        )}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onShowActions();
          }}
          aria-label={`${place.name} 순번 액션`}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-base font-bold text-primary transition-all active:scale-95",
            isSelected ? "border-2 border-primary shadow-sm" : "border border-primary"
          )}
        >
          {getOrderBadge(order - 1)}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">{place.name}</h3>
            {place.time && (
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {place.time}
              </span>
            )}
          </div>
          {place.memo && (
            <motion.p
              layout
              className={cn(
                "text-xs text-muted-foreground",
                isSelected ? "whitespace-pre-wrap" : "truncate"
              )}
            >
              {place.memo}
            </motion.p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            aria-label="수정"
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted active:scale-95"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMoveUp();
            }}
            disabled={isFirst}
            aria-label="위로 이동"
            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMoveDown();
            }}
            disabled={isLast}
            aria-label="아래로 이동"
            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-0.5 h-5 w-5 text-destructive hover:bg-destructive/10"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            aria-label="삭제"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
