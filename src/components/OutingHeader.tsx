"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { addDaysToKey, formatDateLabel } from "@/lib/date";
import BottomSheet from "@/components/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OutingHeaderProps = {
  date: string;
  isToday: boolean;
  title: string | null;
  onRenameTitle: (title: string | null) => void;
};

export default function OutingHeader({ date, isToday, title, onRenameTitle }: OutingHeaderProps) {
  const router = useRouter();
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");

  const goToDate = (targetDate: string) => router.push(`/outing/${targetDate}`);

  const openRename = () => {
    setDraftTitle(title ?? "");
    setIsRenameOpen(true);
  };

  const handleRenameSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draftTitle.trim();
    onRenameTitle(trimmed ? trimmed : null);
    setIsRenameOpen(false);
  };

  return (
    <header
      className="flex shrink-0 items-center gap-1 border-b border-border bg-background px-2 pb-3"
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

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => goToDate(addDaysToKey(date, -1))}
          aria-label="하루 전"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-col items-center">
          <div className="flex min-w-0 items-center gap-1">
            <h1 className="truncate text-base font-bold text-foreground">{title ?? formatDateLabel(date)}</h1>
            {isToday && (
              <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                오늘
              </span>
            )}
            <button
              type="button"
              onClick={openRename}
              aria-label="일정 이름 수정"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
          <p className="truncate text-xs text-muted-foreground">{title ? formatDateLabel(date) : "하루 일정을 더 쉽게"}</p>
        </div>

        <button
          type="button"
          onClick={() => goToDate(addDaysToKey(date, 1))}
          aria-label="하루 다음"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="w-9 shrink-0" aria-hidden="true" />

      <BottomSheet open={isRenameOpen} onOpenChange={setIsRenameOpen} title="일정 이름 수정">
        <form onSubmit={handleRenameSubmit} className="flex flex-col gap-3">
          <Input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            placeholder={formatDateLabel(date)}
            maxLength={30}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">비워두면 날짜({formatDateLabel(date)})로 표시돼요.</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsRenameOpen(false)}>
              취소
            </Button>
            <Button type="submit" className="flex-1">
              저장
            </Button>
          </div>
        </form>
      </BottomSheet>
    </header>
  );
}
