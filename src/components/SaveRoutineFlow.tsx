"use client";

import { useEffect, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRoutines } from "@/hooks/useRoutines";
import { generateId } from "@/lib/id";
import { Place } from "@/types/place";

type SaveRoutineFlowProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 저장할 현재 일정의 장소 목록(방문 순서 그대로). */
  places: Place[];
  onSaved: (message: string) => void;
};

/** "저장하기"를 누르면 뜨는 루틴 제목 입력 팝업입니다. 제목만 받아 현재 장소 목록/순서를
 * 그대로 새 루틴으로 저장합니다 — 출발 시간/이동수단/날짜는 루틴에 담기지 않습니다. */
export default function SaveRoutineFlow({ open, onOpenChange, places, onSaved }: SaveRoutineFlowProps) {
  const [routines, setRoutines] = useRoutines();
  const [title, setTitleValue] = useState("");
  const [titleError, setTitleError] = useState("");
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setTitleValue("");
      setTitleError("");
      setIsDuplicateOpen(false);
    }
  }, [open]);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError("루틴 제목을 입력해주세요");
      return;
    }
    // 같은 이름의 루틴이 이미 있으면 저장하지 않고 안내만 띄웁니다 — 제목 입력 화면은 그대로
    // 유지되어(닫지 않음) 입력했던 이름을 바로 이어서 수정할 수 있습니다.
    if (routines.some((routine) => routine.name === trimmed)) {
      setIsDuplicateOpen(true);
      return;
    }
    setRoutines((prev) => [...prev, { id: generateId(), name: trimmed, places }]);
    onOpenChange(false);
    onSaved("루틴이 저장되었습니다.");
  };

  return (
    <>
      <BottomSheet open={open} onOpenChange={onOpenChange} title="루틴 제목 작성하기">
        <div className="flex flex-col gap-3 pb-1">
          <div>
            <Input
              id="routine-title"
              aria-label="루틴 제목"
              autoComplete="off"
              value={title}
              onChange={(event) => {
                setTitleValue(event.target.value);
                if (titleError) setTitleError("");
              }}
              placeholder="예: 주말 나들이 루틴"
              autoFocus
            />
            {titleError && <p className="mt-1.5 text-xs font-medium text-destructive">{titleError}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="button" className="flex-1" onClick={handleSubmit}>
              저장
            </Button>
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={isDuplicateOpen}
        onOpenChange={setIsDuplicateOpen}
        title="루틴 이름 중복"
        description="이미 사용 중인 루틴 이름입니다."
        confirmLabel="확인"
        hideCancel
        hideTitle
        onConfirm={() => setIsDuplicateOpen(false)}
      />
    </>
  );
}
