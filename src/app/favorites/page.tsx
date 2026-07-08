"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomSheet from "@/components/BottomSheet";
import { useFavorites } from "@/hooks/useFavorites";
import { useOutingsMap } from "@/hooks/useOutings";
import { formatDateLabel, getTodayDateString } from "@/lib/date";
import { generateId } from "@/lib/id";
import { FavoritePlace } from "@/types/favorite";

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useFavorites();
  const [, setOutings] = useOutingsMap();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dateTarget, setDateTarget] = useState<FavoritePlace | null>(null);
  const [chosenDate, setChosenDate] = useState(getTodayDateString());

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2000);
  };

  const addFavoriteToDate = (date: string, favorite: FavoritePlace) => {
    setOutings((prev) => ({
      ...prev,
      [date]: {
        title: prev[date]?.title ?? null,
        places: [
          ...(prev[date]?.places ?? []),
          {
            id: generateId(),
            name: favorite.name,
            memo: favorite.memo,
            lat: favorite.lat,
            lng: favorite.lng,
          },
        ],
        updatedAt: Date.now(),
      },
    }));
    showToast(`"${favorite.name}"을(를) ${formatDateLabel(date)} 일정에 추가했어요`);
  };

  const handleAddToToday = (favorite: FavoritePlace) => {
    addFavoriteToDate(getTodayDateString(), favorite);
  };

  const handleOpenDatePicker = (favorite: FavoritePlace) => {
    setChosenDate(getTodayDateString());
    setDateTarget(favorite);
  };

  const handleConfirmDate = () => {
    if (dateTarget) addFavoriteToDate(chosenDate, dateTarget);
    setDateTarget(null);
  };

  const handleDelete = (id: string) => {
    setFavorites((prev) => prev.filter((favorite) => favorite.id !== id));
  };

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-background">
      <header
        className="flex shrink-0 items-center gap-2 border-b border-border bg-background px-3 pb-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="홈으로"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-foreground">즐겨찾기 장소</h1>
          <p className="text-xs text-muted-foreground">자주 가는 장소를 일정에 바로 추가해요</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {favorites.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">저장된 즐겨찾기 장소가 없어요</p>
        ) : (
          favorites.map((favorite) => (
            <div key={favorite.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-foreground">{favorite.name}</p>
                  {favorite.category && (
                    <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {favorite.category}
                    </span>
                  )}
                  {favorite.memo && <p className="mt-1 text-sm text-muted-foreground">{favorite.memo}</p>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(favorite.id)}
                  aria-label="삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => handleAddToToday(favorite)}>
                  <Plus className="h-3.5 w-3.5" />
                  오늘 외출에 추가
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleOpenDatePicker(favorite)}>
                  <CalendarPlus className="h-3.5 w-3.5" />
                  날짜 선택 후 추가
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomSheet
        open={dateTarget !== null}
        onOpenChange={(open) => !open && setDateTarget(null)}
        title="날짜 선택"
      >
        <div className="flex flex-col gap-3 pb-1">
          <input
            type="date"
            value={chosenDate}
            onChange={(event) => setChosenDate(event.target.value)}
            className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          <Button type="button" className="w-full" onClick={handleConfirmDate}>
            이 날짜에 추가하기
          </Button>
        </div>
      </BottomSheet>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed inset-x-0 z-30 mx-auto w-fit max-w-[90%] rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg"
            style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
