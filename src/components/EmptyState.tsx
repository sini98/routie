"use client";

import { motion } from "framer-motion";
import { FolderOutput, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  onCreateNew: () => void;
  onLoadRoutine: () => void;
};

/** 오늘 외출/지정 외출 모두 이 날짜에 장소가 하나도 없을 때 뜹니다. 할 수 있는 행동이
 * "새 외출 만들기"와 "루틴 불러오기" 둘뿐이므로, 이 화면에서만 두 버튼을 가운데 모아
 * 보여줍니다 — 우측 상단 루틴 메뉴/우측 하단 FAB는 OutingScreen에서 이 화면일 때 숨겨서
 * 같은 행동이 중복 노출되지 않게 합니다. */
export default function EmptyState({ onCreateNew, onLoadRoutine }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center px-6 pb-4 pt-2 text-center"
    >
      <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary">
        <MapPinned className="h-5 w-5" />
      </div>
      <p className="mb-0.5 text-base font-semibold text-foreground">이 날짜에는 외출 일정이 없어요.</p>
      <p className="mb-3 text-sm leading-6 text-muted-foreground">
        새 외출을 만들거나, 루틴 불러오기로 시작해 보세요.
      </p>
      <div className="flex w-full max-w-[240px] flex-col gap-1.5">
        <Button type="button" className="w-full" onClick={onCreateNew}>
          + 새 외출 만들기
        </Button>
        <Button type="button" variant="outline" className="w-full bg-white" onClick={onLoadRoutine}>
          <FolderOutput className="h-4 w-4 text-primary" />
          루틴 불러오기
        </Button>
      </div>
    </motion.div>
  );
}
