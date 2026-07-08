"use client";

import BottomSheet from "@/components/BottomSheet";
import { useFavorites } from "@/hooks/useFavorites";
import { FavoritePlace } from "@/types/favorite";

type SavedPlacesPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (favorite: FavoritePlace) => void;
};

export default function SavedPlacesPicker({ open, onOpenChange, onPick }: SavedPlacesPickerProps) {
  const [favorites] = useFavorites();

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="저장한 장소 불러오기">
      {favorites.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">저장된 즐겨찾기 장소가 없어요</p>
      ) : (
        <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pb-1">
          {favorites.map((favorite) => (
            <button
              key={favorite.id}
              type="button"
              onClick={() => onPick(favorite)}
              className="flex items-center justify-between rounded-md border border-border p-3 text-left transition-colors hover:bg-muted"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{favorite.name}</span>
                {favorite.category && <span className="text-xs text-muted-foreground">{favorite.category}</span>}
              </span>
              <span className="shrink-0 rounded-full border border-primary/30 px-3 py-1 text-xs font-medium text-primary">
                추가
              </span>
            </button>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
