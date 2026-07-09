"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, ChevronDown, ChevronLeft, FolderPlus, Plus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomSheet from "@/components/BottomSheet";
import CategoryGroupCard from "@/components/CategoryGroupCard";
import ConfirmDialog from "@/components/ConfirmDialog";
import FloatingButton from "@/components/FloatingButton";
import PlaceForm from "@/components/PlaceForm";
import CategoryPickerSheet from "@/components/CategoryPickerSheet";
import { useFavorites } from "@/hooks/useFavorites";
import { useCategories } from "@/hooks/useCategories";
import { useOutingsMap } from "@/hooks/useOutings";
import { groupFavoritesByCategory } from "@/lib/favoriteGroups";
import { formatDateLabel, getTodayDateString } from "@/lib/date";
import { generateId } from "@/lib/id";
import { FavoritePlace } from "@/types/favorite";
import { FALLBACK_CATEGORY } from "@/types/category";
import { Place } from "@/types/place";

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useFavorites();
  const { categories, removeCategory, reorderCategories } = useCategories();
  const groups = useMemo(() => groupFavoritesByCategory(favorites, categories), [favorites, categories]);
  const [, setOutings] = useOutingsMap();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dateTarget, setDateTarget] = useState<FavoritePlace | null>(null);
  const [chosenDate, setChosenDate] = useState(getTodayDateString());
  // 카드를 펼치지 않아도 바로 쓸 수 있는 빠른 액션 두 가지: "+" 를 누르면 오늘/날짜 선택
  // 중 하나를 고르는 시트가, 연필을 누르면 이름 수정 시트가 뜹니다.
  const [addMenuFor, setAddMenuFor] = useState<FavoritePlace | null>(null);
  const [renameTarget, setRenameTarget] = useState<FavoritePlace | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  // 카테고리 카드입니다 — 여러 카테고리를 동시에 펼쳐둘 수 있습니다("저장한 장소
  // 불러오기"의 SavedPlacesPicker와 같은 패턴). 기본은 전부 접힌 상태로 시작합니다.
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  // 카테고리를 펼친 뒤, 그 안의 장소 하나를 누르면 오늘 추가/날짜 선택/삭제 액션이
  // 나오는 항목별 아코디언입니다 — 한 번에 하나만 펼쳐집니다.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // 즐겨찾기 화면 자체에서 바로 장소를 추가하는 흐름입니다 — 장소 추가 화면과 달리
  // "즐겨찾기로 저장" 체크를 거치지 않고, 제출하면 항상 즐겨찾기에 저장됩니다.
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addCategory, setAddCategory] = useState<string | null>(null);
  const [isAddCategoryPickerOpen, setIsAddCategoryPickerOpen] = useState(false);
  // 이미 저장된 즐겨찾기의 카테고리만 바꾸는 흐름입니다(이름 수정과 같은 자리의 별도 액션).
  const [categoryTarget, setCategoryTarget] = useState<FavoritePlace | null>(null);
  // 특정 즐겨찾기에 붙일 카테고리를 "고르는" 게 아니라, 카테고리 자체를 새로 만들거나
  // 정리하기 위한 진입점입니다 — 헤더의 카테고리 추가 버튼에서 엽니다.
  const [isManageCategoryOpen, setIsManageCategoryOpen] = useState(false);
  // 카테고리 그룹 헤더의 삭제 버튼으로 시작되는 카테고리 자체 삭제 확인입니다("기타"는
  // 이 버튼 자체가 뜨지 않습니다).
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<string | null>(null);

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

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ScheduleList의 카드 드래그와 같은 센서 구성입니다 — 마우스는 거리 기반, 터치는 지연
  // 기반으로 나눠서, 짧은 탭(펼치기/접기)과 드래그(순서 변경)가 서로 방해하지 않습니다.
  const categorySensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentOrder = groups.map((group) => group.category);
    const oldIndex = currentOrder.indexOf(active.id as string);
    const newIndex = currentOrder.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    reorderCategories(arrayMove(currentOrder, oldIndex, newIndex));
  };

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
    setExpandedId((prev) => (prev === id ? null : prev));
  };

  const handleAddMenuToday = (favorite: FavoritePlace) => {
    handleAddToToday(favorite);
    setAddMenuFor(null);
  };

  const handleAddMenuDatePicker = (favorite: FavoritePlace) => {
    setAddMenuFor(null);
    handleOpenDatePicker(favorite);
  };

  const openRename = (favorite: FavoritePlace) => {
    setRenameDraft(favorite.name);
    setRenameTarget(favorite);
  };

  const handleCategoryConfirm = (category: string) => {
    if (categoryTarget) {
      setFavorites((prev) =>
        prev.map((favorite) => (favorite.id === categoryTarget.id ? { ...favorite, category } : favorite))
      );
    }
    setCategoryTarget(null);
  };

  const handleAddFavorite = (place: Place) => {
    setFavorites((prev) => [
      ...prev,
      {
        id: generateId(),
        name: place.name,
        category: addCategory ?? undefined,
        memo: place.memo,
        lat: place.lat,
        lng: place.lng,
      },
    ]);
    showToast(`"${place.name}"을(를) 즐겨찾기에 추가했어요`);
    setIsAddOpen(false);
    setAddCategory(null);
  };

  const handleConfirmDeleteCategory = () => {
    if (deleteCategoryTarget) {
      removeCategory(deleteCategoryTarget);
      setExpandedCategories((prev) => {
        const next = new Set(prev);
        next.delete(deleteCategoryTarget);
        return next;
      });
    }
    setDeleteCategoryTarget(null);
  };

  const handleRenameSubmit = () => {
    const trimmed = renameDraft.trim();
    if (renameTarget && trimmed) {
      setFavorites((prev) =>
        prev.map((favorite) => (favorite.id === renameTarget.id ? { ...favorite, name: trimmed } : favorite))
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
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">즐겨찾기</h1>
          <p className="text-xs text-muted-foreground">자주 가는 장소를 일정에 바로 추가해요</p>
        </div>
        <button
          type="button"
          onClick={() => setIsManageCategoryOpen(true)}
          aria-label="카테고리 추가"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <FolderPlus className="h-5 w-5" />
        </button>
      </header>

      <div
        className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pt-4"
        style={{ paddingBottom: "max(5rem, calc(env(safe-area-inset-bottom) + 4.5rem))" }}
      >
        {groups.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">저장된 즐겨찾기가 없어요</p>
        ) : (
          <>
            {groups.length >= 2 && (
              <p className="mb-1 px-1 text-[11px] text-[#999]">카드를 드래그하여 순서를 변경해보세요.</p>
            )}

            <DndContext
              sensors={categorySensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={handleCategoryDragEnd}
            >
              <SortableContext
                items={groups.map((group) => group.category)}
                strategy={verticalListSortingStrategy}
              >
                {groups.map((group) => (
                  <CategoryGroupCard
                    key={group.category}
                    group={group}
                    isExpanded={expandedCategories.has(group.category)}
                    onToggleExpand={() => toggleCategory(group.category)}
                    canDelete={group.category !== FALLBACK_CATEGORY}
                    onDeleteCategory={() => setDeleteCategoryTarget(group.category)}
                    expandedFavoriteId={expandedId}
                    onToggleFavoriteExpand={toggleExpand}
                    onRenameFavorite={openRename}
                    onChangeFavoriteCategory={setCategoryTarget}
                    onAddFavoriteMenu={setAddMenuFor}
                    onDeleteFavorite={handleDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>

      <FloatingButton
        onClick={() => {
          setAddCategory(null);
          setIsAddOpen(true);
        }}
      />

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

      <BottomSheet
        open={addMenuFor !== null}
        onOpenChange={(open) => !open && setAddMenuFor(null)}
        title={addMenuFor?.name ?? ""}
      >
        <div className="flex flex-col gap-2 pb-1">
          <Button
            type="button"
            variant="outline"
            className="justify-start"
            onClick={() => addMenuFor && handleAddMenuToday(addMenuFor)}
          >
            <Plus className="h-4 w-4" />
            오늘 외출에 추가
          </Button>
          <Button
            type="button"
            variant="outline"
            className="justify-start"
            onClick={() => addMenuFor && handleAddMenuDatePicker(addMenuFor)}
          >
            <CalendarPlus className="h-4 w-4" />
            날짜 선택 후 추가
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={renameTarget !== null} onOpenChange={(open) => !open && setRenameTarget(null)} title="이름 수정">
        <div className="flex flex-col gap-3 pb-1">
          <Input
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            placeholder="장소 이름"
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

      <BottomSheet
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!open) setAddCategory(null);
          setIsAddOpen(open);
        }}
        title="즐겨찾기 추가"
        titleAction={
          <button
            type="button"
            onClick={() => setIsAddCategoryPickerOpen(true)}
            aria-label="카테고리 선택"
            className="flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            {addCategory ?? FALLBACK_CATEGORY}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        }
      >
        <PlaceForm
          existingPlaces={[]}
          isToday
          showTimeField={false}
          onCancel={() => setIsAddOpen(false)}
          onSubmit={handleAddFavorite}
          submitLabel="즐겨찾기에 추가"
        />
      </BottomSheet>

      <CategoryPickerSheet
        open={isAddCategoryPickerOpen}
        onOpenChange={setIsAddCategoryPickerOpen}
        initialCategory={addCategory}
        onConfirm={setAddCategory}
      />

      <CategoryPickerSheet
        open={categoryTarget !== null}
        onOpenChange={(open) => !open && setCategoryTarget(null)}
        initialCategory={categoryTarget?.category ?? null}
        onConfirm={handleCategoryConfirm}
      />

      <CategoryPickerSheet
        open={isManageCategoryOpen}
        onOpenChange={setIsManageCategoryOpen}
        title="카테고리 관리"
        onConfirm={() => setIsManageCategoryOpen(false)}
      />

      <ConfirmDialog
        open={deleteCategoryTarget !== null}
        onOpenChange={(open) => !open && setDeleteCategoryTarget(null)}
        title="카테고리를 삭제할까요?"
        description={
          <>
            &ldquo;{deleteCategoryTarget}&rdquo; 카테고리를 삭제하면, 이 카테고리를 쓰던 즐겨찾기는 자동으로
            &ldquo;기타&rdquo;로 바뀝니다.
          </>
        }
        onConfirm={handleConfirmDeleteCategory}
      />

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
