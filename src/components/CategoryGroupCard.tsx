"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, ChevronUp, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { FavoriteGroup } from "@/lib/favoriteGroups";
import { FavoritePlace } from "@/types/favorite";
import { cn } from "@/lib/utils";

type CategoryGroupCardProps = {
  group: FavoriteGroup;
  isExpanded: boolean;
  onToggleExpand: () => void;
  /** "기타"는 이름 수정/삭제 버튼 자체가 뜨지 않습니다 — 둘 다 안 되지만 순서는 바꿀 수 있습니다. */
  canDelete: boolean;
  onRenameCategory: () => void;
  onDeleteCategory: () => void;
  expandedFavoriteId: string | null;
  onToggleFavoriteExpand: (id: string) => void;
  onRenameFavorite: (favorite: FavoritePlace) => void;
  onChangeFavoriteCategory: (favorite: FavoritePlace) => void;
  onAddFavoriteMenu: (favorite: FavoritePlace) => void;
  onDeleteFavorite: (favorite: FavoritePlace) => void;
};

/**
 * 즐겨찾기 화면의 카테고리 카드 하나입니다. 카드 전체(펼치기/접기 토글 영역)를 길게 눌러
 * 드래그하면 카테고리 순서를 바꿀 수 있습니다(dnd-kit useSortable) — ScheduleCard와 같은
 * 패턴으로, 드래그 판정(activationConstraint)이 짧은 탭과 드래그를 구분해주기 때문에 탭으로
 * 펼치기/접기를 누르는 동작과 충돌하지 않습니다. 삭제 버튼은 별도 형제 버튼이라 드래그
 * 리스너가 걸려 있지 않습니다.
 */
export default function CategoryGroupCard({
  group,
  isExpanded,
  onToggleExpand,
  canDelete,
  onRenameCategory,
  onDeleteCategory,
  expandedFavoriteId,
  onToggleFavoriteExpand,
  onRenameFavorite,
  onChangeFavoriteCategory,
  onAddFavoriteMenu,
  onDeleteFavorite,
}: CategoryGroupCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.category,
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
        "overflow-hidden rounded-lg border border-border bg-card transition-shadow",
        isDragging ? "relative z-10 shadow-xl" : "shadow-sm"
      )}
    >
      <div className="flex w-full items-center gap-1 pr-2">
        <button
          type="button"
          onClick={onToggleExpand}
          {...attributes}
          {...listeners}
          aria-label={`${group.category} 카테고리, 길게 눌러 드래그하면 순서를 바꿀 수 있어요`}
          className="flex flex-1 touch-manipulation cursor-grab items-center gap-1.5 p-4 text-left active:cursor-grabbing"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0 truncate text-base font-semibold text-foreground">{group.category}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{group.favorites.length}개</span>
        </button>

        {canDelete && (
          <button
            type="button"
            onClick={onRenameCategory}
            aria-label={`${group.category} 카테고리 이름 수정`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}

        {canDelete && (
          <button
            type="button"
            onClick={onDeleteCategory}
            aria-label={`${group.category} 카테고리 삭제`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 border-t border-border p-2">
              {group.favorites.length === 0 && (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                  아직 이 카테고리에 저장된 장소가 없어요
                </p>
              )}
              {group.favorites.map((favorite) => {
                const isFavoriteExpanded = favorite.id === expandedFavoriteId;
                return (
                  <div key={favorite.id} className="overflow-hidden rounded-md border border-border bg-white">
                    {/* 태그는 장소의 "정보(속성)"라 이름 옆 왼쪽에 두고, 이름 수정/추가/삭제는
                        "관리 액션"이라 오른쪽에 한 덩어리로 모읍니다. 왼쪽(토글 버튼 + 태그)은
                        flex-1을 주지 않아 내용 크기만큼만 차지하고(이름이 길면 truncate),
                        오른쪽 액션 그룹에 ml-auto를 줘서 둘 사이 남는 공간을 모두 흡수하게
                        했습니다 — 버튼 안에 버튼을 중첩할 수 없어서 모두 형제 요소로 분리. */}
                    <div className="flex w-full items-center gap-1 p-3">
                      <button
                        type="button"
                        onClick={() => onToggleFavoriteExpand(favorite.id)}
                        aria-label={isFavoriteExpanded ? "접기" : "펼치기"}
                        className="flex min-w-0 items-center gap-1.5 text-left"
                      >
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                            isFavoriteExpanded && "rotate-90"
                          )}
                        />
                        <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                          {favorite.name}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onChangeFavoriteCategory(favorite)}
                        aria-label="카테고리 변경"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                      >
                        <Tag className="h-3.5 w-3.5" />
                      </button>

                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onAddFavoriteMenu(favorite)}
                          aria-label="일정에 추가"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onRenameFavorite(favorite)}
                          aria-label="이름 수정"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteFavorite(favorite)}
                          aria-label="삭제"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isFavoriteExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border p-3 pt-2.5">
                            {/* 오늘 추가/날짜 선택/삭제는 이제 접힌 카드의 오른쪽 아이콘으로도
                                바로 되기 때문에, 여기서는 중복되는 버튼을 두지 않고 메모만
                                보여줍니다. */}
                            {favorite.memo ? (
                              <p className="text-sm text-muted-foreground">{favorite.memo}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground/60">메모 없음</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
