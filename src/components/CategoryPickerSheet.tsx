"use client";

import { KeyboardEvent, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCategories } from "@/hooks/useCategories";
import { FALLBACK_CATEGORY } from "@/types/category";
import { cn } from "@/lib/utils";

type CategoryPickerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 이미 골라둔 카테고리가 있으면 시트가 열릴 때 그 칩을 미리 선택 표시합니다. */
  initialCategory?: string | null;
  /** "확인"을 눌러 선택을 확정하면 호출됩니다. 시트를 닫는 것까지 이 컴포넌트가 책임집니다. */
  onConfirm: (category: string) => void;
  /** 시트 제목. 특정 장소/즐겨찾기에 붙일 카테고리를 "고르는" 맥락이 아니라, 즐겨찾기
   * 화면에서 카테고리 자체를 만들고 관리하는 맥락처럼 문구가 달라야 할 때만 지정합니다. */
  title?: string;
  /** true(기본값)면 칩을 하나 선택하고 "확인"을 눌러야 확정되는 "카테고리 선택" 화면입니다.
   * "카테고리 관리"처럼 추가/삭제가 그 자리에서 바로 반영되는 화면에서는 false로 꺼서
   * "확인" 버튼 자체를 없앱니다 — 즉시 반영되는데 "확인" 버튼이 남아있으면 마치 그 버튼을
   * 눌러야만 저장되는 것처럼 오해할 수 있습니다. 닫기는 드래그/바깥 탭 등 시트의 기존
   * 닫기 동작으로 충분해, 별도의 X 버튼은 두지 않습니다(역할 중복). "카테고리 관리"는
   * 이름 수정 없이 추가/삭제 역할만 담당합니다(이름 수정은 즐겨찾기 화면의 카테고리
   * 카드에서만 제공합니다).
   */
  requireSelection?: boolean;
};

/**
 * 즐겨찾기에 붙일 카테고리를 칩(chip)으로 고르는 Bottom Sheet입니다. 카테고리 칩을 눌러
 * 하나만 선택하고(다시 누르면 다른 칩으로 바뀜 — 라디오 버튼처럼 동시에 하나만 활성화),
 * "확인"을 눌러야 실제로 반영됩니다. `TimePicker`의 "고르는 동안은 미리보기, 확인을 눌러야
 * 확정" 패턴과 같습니다. 각 칩 우측 상단의 X로 삭제할 수 있습니다 — "기타"는 삭제된
 * 카테고리의 즐겨찾기가 갈 곳이 항상 있어야 하는 기본 카테고리라 X가 뜨지 않습니다. 목록
 * 끝의 +로 새 카테고리를 추가할 수 있고, 새로 추가한 칩도 바로 선택 상태가 되어 곧바로
 * "확인"만 누르면 됩니다.
 */
export default function CategoryPickerSheet({
  open,
  onOpenChange,
  initialCategory = null,
  onConfirm,
  title = "카테고리 선택",
  requireSelection = true,
}: CategoryPickerSheetProps) {
  const { categories, addCategory, removeCategory } = useCategories();
  const [selected, setSelected] = useState<string | null>(initialCategory);
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // 시트를 열 때마다 그 시점의 초기 선택값으로 다시 맞춥니다.
  useEffect(() => {
    if (open) setSelected(initialCategory);
  }, [open, initialCategory]);

  const handleAdd = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    addCategory(trimmed);
    setSelected(trimmed);
    setNewCategoryName("");
    setIsAdding(false);
  };

  const handleAddKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAdd();
    } else if (event.key === "Escape") {
      setIsAdding(false);
      setNewCategoryName("");
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    removeCategory(deleteTarget);
    if (selected === deleteTarget) setSelected(null);
    setDeleteTarget(null);
  };

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm(selected);
    onOpenChange(false);
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title}>
      <div className="flex flex-col gap-5 pb-1">
        {/* 이 시트의 실제 스크롤 컨테이너는 ui/sheet.tsx의 콘텐츠 wrapper(overflow-y-auto)이고,
            위쪽에 여백이 없어서 스크롤 영역의 맨 위(y=0)에 붙어있는 칩의 삭제(X) 배지가
            칩 테두리 밖으로 튀어나온 부분(-top-1.5)이 스크롤 영역 위쪽 경계에 가려 잘려
            보였습니다. 그 wrapper는 앱의 모든 Bottom Sheet가 공유하는 컴포넌트라 거기서
            overflow를 바꾸는 대신, 여기서만 pt-2로 위쪽 여백을 확보해 배지가 스크롤 영역
            경계 안쪽에 온전히 들어오게 했습니다. 배지 자체의 돌출량도 -top-1.5 -> -top-1로
            줄여 잘림 여지를 더 없앴습니다. */}
        <div className="flex flex-wrap gap-x-2 gap-y-3 overflow-visible pb-3 pt-2">
          {categories.map((category) => (
            <div key={category} className="group relative">
              <button
                type="button"
                onClick={() => setSelected(category)}
                className={cn(
                  "rounded-full border px-3 py-1.5 pr-3 text-xs font-medium transition-colors",
                  selected === category
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-white text-muted-foreground hover:bg-muted"
                )}
              >
                {category}
              </button>
              {category !== FALLBACK_CATEGORY && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteTarget(category);
                  }}
                  aria-label={`${category} 카테고리 삭제`}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-muted-foreground text-white shadow-sm transition-colors hover:bg-destructive"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}

          {isAdding ? (
            <div className="flex items-center gap-1.5">
              <Input
                autoFocus
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="새 카테고리"
                className="h-[30px] w-28 px-2 py-0 text-xs"
              />
              <Button type="button" size="sm" className="h-[30px] px-2.5" onClick={handleAdd}>
                추가
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-[30px] px-2"
                onClick={() => {
                  setIsAdding(false);
                  setNewCategoryName("");
                }}
              >
                취소
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              aria-label="카테고리 추가"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {requireSelection && (
          <Button type="button" className="w-full" disabled={!selected} onClick={handleConfirm}>
            확인
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="카테고리를 삭제할까요?"
        description={
          <>
            &ldquo;{deleteTarget}&rdquo; 카테고리를 삭제하면, 이 카테고리를 쓰던 즐겨찾기는 자동으로 &ldquo;기타&rdquo;로
            바뀝니다.
          </>
        }
        onConfirm={handleConfirmDelete}
      />
    </BottomSheet>
  );
}
