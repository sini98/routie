"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { ChevronLeft, FolderPlus } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import ConfirmDialog from "@/components/ConfirmDialog";
import FloatingButton from "@/components/FloatingButton";
import RoutineCard from "@/components/RoutineCard";
import SaveRoutineFlow from "@/components/SaveRoutineFlow";
import Toast from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRoutines } from "@/hooks/useRoutines";
import { RoutieRoutine } from "@/types/routine";

export default function RoutinesPage() {
  const router = useRouter();
  const [routines, setRoutines] = useRoutines();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoutieRoutine | null>(null);
  const [renameTarget, setRenameTarget] = useState<RoutieRoutine | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2000);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentOrder = routines.map((routine) => routine.id);
    const oldIndex = currentOrder.indexOf(active.id as string);
    const newIndex = currentOrder.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    setRoutines(arrayMove(routines, oldIndex, newIndex));
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      setRoutines((prev) => prev.filter((routine) => routine.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const openRename = (routine: RoutieRoutine) => {
    setRenameDraft(routine.name);
    setRenameTarget(routine);
  };

  const handleRenameSubmit = () => {
    const trimmed = renameDraft.trim();
    if (renameTarget && trimmed) {
      setRoutines((prev) =>
        prev.map((routine) => (routine.id === renameTarget.id ? { ...routine, name: trimmed } : routine))
      );
    }
    setRenameTarget(null);
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
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-foreground">루티 루틴</h1>
          <p className="text-xs text-muted-foreground">반복되는 외출을 템플릿으로 저장해요</p>
        </div>
        {/* 하단 FAB와 똑같이 "새 루티 루틴 만들기"를 열지만, 아이콘은 일부러 다르게(폴더+)
            둡니다 — 둘 다 단순 +였다면 같은 화면에 똑같은 모양의 버튼이 두 개 있는 것처럼
            보여 혼동을 줄 수 있어서, 폴더+로 "루틴 묶음에 새로 추가"라는 의미를 구분합니다. */}
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          aria-label="루티 루틴 추가"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <FolderPlus className="h-5 w-5" />
        </button>
      </header>

      <div
        className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pt-4"
        style={{ paddingBottom: "max(5rem, calc(env(safe-area-inset-bottom) + 4.5rem))" }}
      >
        {routines.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">저장된 루티 루틴이 없어요</p>
        ) : (
          <>
            {routines.length >= 2 && (
              <p className="text-[11px] text-[#999]">카드를 드래그하여 순서를 변경해 보세요.</p>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            >
              <SortableContext items={routines.map((routine) => routine.id)} strategy={verticalListSortingStrategy}>
                {routines.map((routine) => (
                  <RoutineCard
                    key={routine.id}
                    routine={routine}
                    onOpen={() => router.push(`/routines/${routine.id}`)}
                    onRename={() => openRename(routine)}
                    onDelete={() => setDeleteTarget(routine)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>

      <FloatingButton ariaLabel="루티 루틴 추가" onClick={() => setIsCreateOpen(true)} />

      <SaveRoutineFlow open={isCreateOpen} onOpenChange={setIsCreateOpen} places={[]} onSaved={showToast} />

      <BottomSheet open={renameTarget !== null} onOpenChange={(open) => !open && setRenameTarget(null)} title="이름 수정">
        <div className="flex flex-col gap-3 pb-1">
          <Input
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            placeholder="루틴 이름"
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setRenameTarget(null)}>
              취소
            </Button>
            <Button type="button" className="flex-1" disabled={!renameDraft.trim()} onClick={handleRenameSubmit}>
              저장
            </Button>
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="루티 루틴을 삭제할까요?"
        description={
          <>&ldquo;{deleteTarget?.name}&rdquo; 루틴을 삭제하면 되돌릴 수 없습니다.</>
        }
        onConfirm={handleConfirmDelete}
      />

      <Toast message={toastMessage} />
    </div>
  );
}
