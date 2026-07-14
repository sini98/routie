"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { Button } from "@/components/ui/button";
import { useRoutines } from "@/hooks/useRoutines";
import { Place } from "@/types/place";
import { RoutieRoutine } from "@/types/routine";

type RoutinePickerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (routineName: string, places: Place[]) => void;
};

/**
 * 오늘 외출이든 지정 외출(미래 날짜)이든, 그 일정을 저장된 루티 루틴으로 채우기 위한
 * 시트입니다. 루틴을 고르면 그 루틴의 장소 목록을 미리 보여주고, 이번 일정에 필요 없는
 * 장소는 "제외"할 수 있습니다 — 이 화면은 루틴을 편집하는 화면이 아니라 이번 일정에
 * 적용할 내용을 미리 조정하는 화면이라, 제외/복구는 저장된 원본 루틴에는 전혀 반영되지
 * 않고 이번 선택에만 적용됩니다(시트를 다시 열면 원본 그대로 다시 보여줍니다).
 */
export default function RoutinePickerSheet({ open, onOpenChange, onPick }: RoutinePickerSheetProps) {
  const [routines] = useRoutines();
  const [selected, setSelected] = useState<RoutieRoutine | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  // 시트를 열 때마다 이전 선택을 초기화합니다 — 매번 목록부터 다시 고르게 합니다.
  useEffect(() => {
    if (open) {
      setSelected(null);
      setExcludedIds(new Set());
    }
  }, [open]);

  const handleSelect = (routine: RoutieRoutine) => {
    setSelected(routine);
    setExcludedIds(new Set());
  };

  const exclude = (placeId: string) => {
    setExcludedIds((prev) => new Set(prev).add(placeId));
  };

  // 원본 루틴의 장소 배열 순서를 기준으로 다시 걸러내므로, 복구하면 항상 원래 위치로 돌아갑니다.
  const restore = (placeId: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      next.delete(placeId);
      return next;
    });
  };

  if (selected) {
    const activePlaces = selected.places.filter((place) => !excludedIds.has(place.id));
    const excludedPlaces = selected.places.filter((place) => excludedIds.has(place.id));

    const handleConfirm = () => {
      onPick(selected.name, activePlaces);
    };

    return (
      <BottomSheet open={open} onOpenChange={onOpenChange} title={selected.name} onBack={() => setSelected(null)}>
        <div className="flex flex-col gap-4 pb-1">
          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">방문 순서</p>
            <ul className="flex flex-col gap-1.5">
              {activePlaces.map((place, index) => (
                <li
                  key={place.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-white p-2.5"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm text-foreground">{place.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => exclude(place.id)}
                    aria-label={`${place.name} 제외`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {excludedPlaces.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-muted-foreground">제외된 장소</p>
              <ul className="flex flex-col gap-1.5">
                {excludedPlaces.map((place) => (
                  <li
                    key={place.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border bg-muted/40 p-2.5"
                  >
                    <span className="truncate text-sm text-muted-foreground">{place.name}</span>
                    <button
                      type="button"
                      onClick={() => restore(place.id)}
                      aria-label={`${place.name} 복구`}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white hover:text-foreground"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button type="button" className="w-full" disabled={activePlaces.length === 0} onClick={handleConfirm}>
            이 일정에 적용하기
          </Button>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        <>
          <span className="text-primary/70">루티 루틴</span>에서 불러오기
        </>
      }
    >
      {routines.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          저장된 루티 루틴이 없어요. 홈 화면의 &ldquo;루티 루틴&rdquo;에서 먼저 만들어보세요.
        </p>
      ) : (
        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pb-1">
          {routines.map((routine) => (
            <button
              key={routine.id}
              type="button"
              onClick={() => handleSelect(routine)}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-white p-3 text-left transition-colors hover:bg-muted"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{routine.name}</span>
                <span className="block text-xs text-muted-foreground">장소 {routine.places.length}곳</span>
              </span>
              <span className="shrink-0 rounded-full border border-primary/30 px-3 py-1 text-xs font-medium text-primary">
                선택
              </span>
            </button>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
