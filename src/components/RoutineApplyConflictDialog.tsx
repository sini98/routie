"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type RoutineApplyConflictDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAppend: () => void;
  onOverwrite: () => void;
};

/**
 * 이미 장소가 있는 날짜에 루티 루틴을 적용하려 할 때 뜨는 팝업입니다. RoutinePickerSheet
 * 위에 겹쳐 뜨고("이전 화면" = 루틴 상세/제외 화면이 뒤에 그대로 남아있음), 취소를 누르면
 * 이 팝업만 닫히고 그 화면으로 돌아갑니다 — ConfirmDialog와 같은 data-routie-overlay
 * 패턴으로 아래 깔린 Sheet가 "바깥 클릭"으로 오인해 닫히지 않게 합니다.
 */
export default function RoutineApplyConflictDialog({
  open,
  onOpenChange,
  onAppend,
  onOverwrite,
}: RoutineApplyConflictDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                data-routie-overlay=""
                className="fixed inset-0 z-[10020] bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              data-routie-overlay=""
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <div className="fixed inset-0 z-[10021] flex items-center justify-center px-6 focus:outline-none">
                <motion.div
                  className="w-full max-w-xs rounded-lg bg-white p-5 shadow-xl"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <Dialog.Title className="sr-only">루틴 적용 방식 선택</Dialog.Title>
                  <Dialog.Description className="text-sm text-foreground">현재 일정이 이미 있습니다.</Dialog.Description>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button type="button" variant="outline" className="w-full" onClick={onAppend}>
                      기존 일정에 추가
                    </Button>
                    <Button type="button" variant="outline" className="w-full" onClick={onOverwrite}>
                      덮어쓰기
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => onOpenChange(false)}
                    >
                      취소
                    </Button>
                  </div>
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
