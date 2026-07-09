"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

/**
 * 화면 중앙에 뜨는 확인 모달입니다. Bottom Sheet(아래에서 슬라이드)와 달리 화면 가운데
 * 고정된 카드로 뜨기 때문에, "예/아니오"만 고르면 되는 짧은 확인에 씁니다(현재는 카테고리
 * 삭제 확인 하나뿐).
 *
 * `CategoryPickerSheet`처럼 이미 열려 있는 Bottom Sheet 위에 겹쳐 뜰 수 있습니다 —
 * `LocationPicker`와 똑같이 `data-routie-overlay` 마커를 붙여서, 아래 깔린 Sheet의
 * `onPointerDownOutside`/`onInteractOutside` 예외 처리가 이 모달 안에서 발생한 클릭을
 * "바깥 클릭"으로 오인해 그 Sheet를 닫아버리지 않도록 합니다(`ui/sheet.tsx` 참고).
 * z-index(10020대)도 일반 Sheet(9999/10000)와 LocationPicker(10010)보다 위에 두어,
 * 어떤 화면 위에서 열리든 항상 가장 위 레이어로 보이게 했습니다.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "삭제",
  cancelLabel = "취소",
  onConfirm,
}: ConfirmDialogProps) {
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
              {/* 이 바깥 div는 순수 flex 중앙 정렬 담당이라 transform을 쓰지 않습니다 — 안쪽
                  motion.div가 scale 애니메이션을 돌리면 Framer Motion이 transform 인라인
                  스타일을 통째로 덮어써서, translate(-50%,-50%) 방식으로 중앙 정렬하면
                  애니메이션이 시작되는 순간 정렬이 깨집니다(왼쪽으로 치우쳐 보이는 원인). */}
              <div className="fixed inset-0 z-[10021] flex items-center justify-center px-6 focus:outline-none">
                <motion.div
                  className="w-full max-w-xs rounded-lg bg-white p-5 shadow-xl"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <Dialog.Title className="text-base font-bold text-foreground">{title}</Dialog.Title>
                  <Dialog.Description className="mt-1.5 text-sm text-muted-foreground">
                    {description}
                  </Dialog.Description>
                  <div className="mt-4 flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                      {cancelLabel}
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => {
                        onConfirm();
                        onOpenChange(false);
                      }}
                    >
                      {confirmLabel}
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
