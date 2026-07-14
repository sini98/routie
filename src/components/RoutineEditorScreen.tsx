"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Navigation, Pencil, Trash2 } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import ConfirmDialog from "@/components/ConfirmDialog";
import PlaceForm from "@/components/PlaceForm";
import ScheduleList from "@/components/ScheduleList";
import FloatingButton from "@/components/FloatingButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRoutines } from "@/hooks/useRoutines";
import { getNaverDirectionsUrl } from "@/lib/naver";
import { insertPlaceByTime } from "@/lib/scheduleOrder";
import { Place } from "@/types/place";
import { RoutieRoutine } from "@/types/routine";

type RoutineEditorScreenProps = {
  id: string;
};

export default function RoutineEditorScreen({ id }: RoutineEditorScreenProps) {
  const router = useRouter();
  const [routines, setRoutines] = useRoutines();
  const routine = routines.find((item) => item.id === id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [actionsFor, setActionsFor] = useState<Place | null>(null);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const updateRoutine = (updater: (prev: RoutieRoutine) => RoutieRoutine) => {
    setRoutines((prev) => prev.map((item) => (item.id === id ? updater(item) : item)));
  };

  const setPlaces = (updater: Place[] | ((prev: Place[]) => Place[])) => {
    updateRoutine((prev) => ({
      ...prev,
      places: typeof updater === "function" ? (updater as (prev: Place[]) => Place[])(prev.places) : updater,
    }));
  };

  if (!routine) {
    return (
      <div className="mx-auto flex h-dvh max-w-md flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">루티 루틴을 찾을 수 없어요</p>
        <Button type="button" onClick={() => router.push("/routines")}>
          루티 루틴 목록으로
        </Button>
      </div>
    );
  }

  // 방문 시간이 있으면 그 시간에 맞는 자리에 끼워 넣고, 없으면 맨 뒤에 붙입니다 —
  // OutingScreen의 장소 추가/수정과 동일한 규칙입니다.
  const handleAddPlace = (place: Place) => {
    setPlaces((prev) => insertPlaceByTime(prev, place));
    setIsAddOpen(false);
    setSelectedId(place.id);
  };

  const handleEditPlace = (updated: Place) => {
    setPlaces((prev) => {
      const original = prev.find((place) => place.id === updated.id);
      if (!original || original.time === updated.time) {
        return prev.map((place) => (place.id === updated.id ? updated : place));
      }
      const withoutPlace = prev.filter((place) => place.id !== updated.id);
      return insertPlaceByTime(withoutPlace, updated);
    });
    setEditingPlace(null);
  };

  const handleDeletePlace = (placeId: string) => {
    setPlaces((prev) => prev.filter((place) => place.id !== placeId));
    setSelectedId((current) => (current === placeId ? null : current));
  };

  const openRename = () => {
    setRenameDraft(routine.name);
    setIsRenameOpen(true);
  };

  const handleRenameSubmit = () => {
    const trimmed = renameDraft.trim();
    if (trimmed) updateRoutine((prev) => ({ ...prev, name: trimmed }));
    setIsRenameOpen(false);
  };

  const handleConfirmDeleteRoutine = () => {
    setRoutines((prev) => prev.filter((item) => item.id !== id));
    router.push("/routines");
  };

  const handleOpenDirections = () => {
    if (actionsFor) window.open(getNaverDirectionsUrl(actionsFor), "_blank", "noopener,noreferrer");
    setActionsFor(null);
  };

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-background">
      <header
        className="flex shrink-0 items-center gap-2 border-b border-border bg-background px-3 pb-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={() => router.push("/routines")}
          aria-label="루티 루틴 목록으로"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-foreground">{routine.name}</h1>
        </div>
        {/* 이름 수정(연필)/삭제는 둘 다 "루틴을 관리하는 액션"이라, 제목과 분리해 오른쪽
            액션 영역에 나란히 둡니다 — 연필이 삭제 바로 왼쪽에 옵니다. */}
        <button
          type="button"
          onClick={openRename}
          aria-label="이름 수정"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setIsDeleteOpen(true)}
          aria-label="루티 루틴 삭제"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-3 pt-3"
        style={{ paddingBottom: "max(5rem, calc(env(safe-area-inset-bottom) + 4.5rem))" }}
      >
        {routine.places.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">+ 버튼을 눌러 방문 장소를 추가해보세요</p>
        ) : (
          <>
            {routine.places.length >= 2 && (
              <p className="mb-2 px-1 text-[11px] text-[#999]">카드를 드래그하여 순서를 변경해 보세요.</p>
            )}
            <ScheduleList
              places={routine.places}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onShowActions={setActionsFor}
              onEdit={setEditingPlace}
              onDelete={handleDeletePlace}
              onReorder={setPlaces}
              deleteTone="neutral"
            />
          </>
        )}
      </div>

      <FloatingButton ariaLabel="장소 추가" onClick={() => setIsAddOpen(true)} />

      <BottomSheet open={isAddOpen} onOpenChange={setIsAddOpen} title="장소 추가">
        <PlaceForm
          existingPlaces={routine.places}
          isToday
          onCancel={() => setIsAddOpen(false)}
          onSubmit={handleAddPlace}
          submitLabel="추가하기"
        />
      </BottomSheet>

      <BottomSheet open={editingPlace !== null} onOpenChange={(open) => !open && setEditingPlace(null)} title="장소 수정">
        {editingPlace && (
          <PlaceForm
            initialValue={editingPlace}
            existingPlaces={routine.places}
            isToday
            onCancel={() => setEditingPlace(null)}
            onSubmit={handleEditPlace}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={actionsFor !== null}
        onOpenChange={(open) => !open && setActionsFor(null)}
        title={actionsFor?.name ?? ""}
      >
        <div className="flex flex-col gap-2 pb-1">
          <Button type="button" variant="outline" className="justify-start" onClick={handleOpenDirections}>
            <Navigation className="h-4 w-4" />
            네이버지도에서 길찾기
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={isRenameOpen} onOpenChange={setIsRenameOpen} title="이름 수정">
        <div className="flex flex-col gap-3 pb-1">
          <Input
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            placeholder="루틴 이름"
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsRenameOpen(false)}>
              취소
            </Button>
            <Button type="button" className="flex-1" disabled={!renameDraft.trim()} onClick={handleRenameSubmit}>
              저장
            </Button>
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="루티 루틴을 삭제할까요?"
        description={<>&ldquo;{routine.name}&rdquo; 루틴을 삭제하면 되돌릴 수 없습니다.</>}
        onConfirm={handleConfirmDeleteRoutine}
      />
    </div>
  );
}
