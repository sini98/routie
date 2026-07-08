"use client";

import { KeyboardEvent, useState } from "react";
import { Plus, X } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FALLBACK_CATEGORY } from "@/types/category";

type CategoryPickerProps = {
  value: string;
  onChange: (category: string) => void;
};

/** 즐겨찾기 카테고리를 칩 형태로 선택/추가/삭제하는 UI. */
export default function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { categories, addCategory, removeCategory } = useCategories();
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    addCategory(trimmed);
    onChange(trimmed);
    setNewCategory("");
    setIsAdding(false);
  };

  const handleAddKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAdd();
    } else if (event.key === "Escape") {
      setIsAdding(false);
      setNewCategory("");
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    removeCategory(deleteTarget);
    if (value === deleteTarget) {
      onChange(FALLBACK_CATEGORY);
    }
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <div key={category} className="group relative">
            <button
              type="button"
              onClick={() => onChange(category)}
              className={cn(
                "rounded-full border px-3 py-1.5 pr-3 text-xs font-medium transition-colors",
                value === category
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-muted-foreground hover:bg-muted"
              )}
            >
              {category}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setDeleteTarget(category);
              }}
              aria-label={`${category} 카테고리 삭제`}
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted-foreground text-white shadow-sm transition-colors hover:bg-destructive"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}

        {isAdding ? (
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
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
                setNewCategory("");
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

      {deleteTarget && (
        <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-xs text-foreground">
            &ldquo;{deleteTarget}&rdquo; 카테고리를 삭제할까요? 이 카테고리를 쓰던 즐겨찾기는 자동으로 &ldquo;
            {FALLBACK_CATEGORY}&rdquo;로 바뀝니다.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteTarget(null)}
            >
              취소
            </Button>
            <Button type="button" size="sm" variant="destructive" className="flex-1" onClick={handleConfirmDelete}>
              삭제
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
