"use client";

import { ReactNode } from "react";
import { Sheet } from "@/components/ui/sheet";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** 제목 왼쪽에 붙는 뒤로가기 버튼. 없으면 기존과 동일합니다. */
  onBack?: () => void;
  /** 제목 오른쪽에 붙는 액션(예: 즐겨찾기 별 토글). 없으면 기존과 동일합니다. */
  titleAction?: ReactNode;
  children: ReactNode;
};

export default function BottomSheet({ open, onOpenChange, title, onBack, titleAction, children }: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} onBack={onBack} titleAction={titleAction}>
      {children}
    </Sheet>
  );
}
