"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { useFavorites } from "@/hooks/useFavorites";
import { useCategories } from "@/hooks/useCategories";
import { groupFavoritesByCategory } from "@/lib/favoriteGroups";
import { cn } from "@/lib/utils";
import { FavoritePlace } from "@/types/favorite";

type SavedPlacesPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (favorite: FavoritePlace) => void;
};

/**
 * 전체 즐겨찾기를 한 번에 나열하지 않고, 카테고리별로 접어둔 상태로 보여줍니다.
 * 카테고리를 누르면 그 안의 장소들이 펼쳐지고, 장소를 고르면 기존처럼 onPick으로
 * 바로 일정에 추가됩니다(검색으로 저장했든 지도에서 직접 찍어 저장했든 category만
 * 보고 묶으므로 둘 다 동일하게 나타납니다).
 */
export default function SavedPlacesPicker({ open, onOpenChange, onPick }: SavedPlacesPickerProps) {
  const [favorites] = useFavorites();
  const { categories } = useCategories();
  const groups = useMemo(() => groupFavoritesByCategory(favorites, categories), [favorites, categories]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="저장한 장소 불러오기">
      {favorites.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">저장된 즐겨찾기가 없어요</p>
      ) : (
        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pb-1">
          {groups.map((group) => {
            const isExpanded = expandedCategories.has(group.category);
            return (
              <div key={group.category} className="rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => toggleCategory(group.category)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground">{group.category}</span>
                    <span className="text-xs text-muted-foreground">{group.favorites.length}개</span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                {isExpanded && (
                  <div className="flex flex-col gap-1.5 border-t border-border p-2">
                    {group.favorites.map((favorite) => (
                      <button
                        key={favorite.id}
                        type="button"
                        onClick={() => onPick(favorite)}
                        className="flex items-center justify-between rounded-md border border-border bg-white p-3 text-left transition-colors hover:bg-muted"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground">{favorite.name}</span>
                          {favorite.memo && (
                            <span className="block truncate text-xs text-muted-foreground">{favorite.memo}</span>
                          )}
                        </span>
                        <span className="shrink-0 rounded-full border border-primary/30 px-3 py-1 text-xs font-medium text-primary">
                          추가
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </BottomSheet>
  );
}
