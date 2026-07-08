"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { isLocationPickerOpen } from "@/lib/locationPickerGuard";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
};

/**
 * shadcn/ui의 Sheet 패턴을 Radix Dialog + Framer Motion으로 구현한 Bottom Sheet.
 * forceMount + AnimatePresence 조합으로 열림/닫힘 트랜지션을 직접 제어합니다.
 *
 * 주의: 이 Dialog가 열려 있는 동안 `modal` prop을 동적으로 바꾸지 마세요. Radix는 modal
 * 여부에 따라 내부적으로 서로 다른 컴포넌트를 렌더링하기 때문에, 이미 열린 상태에서 modal 값이
 * 바뀌면 React가 이 Content 서브트리 전체(children 포함)를 언마운트했다가 다시 마운트합니다.
 * LocationPicker처럼 이 Sheet 안에서 열리는 하위 화면이 있다면, modal을 토글하는 대신
 * 그 하위 화면을 Radix Dialog로 만들어 "중첩된 레이어"로 등록되게 하세요(포커스 트랩/바깥 클릭
 * 감지를 Radix가 알아서 최상단 레이어 기준으로 처리해 줍니다). LocationPicker.tsx 참고.
 */
export function Sheet({ open, onOpenChange, title, children }: SheetProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && isLocationPickerOpen()) {
          console.log("[Routie] Sheet onOpenChange(false) 무시됨: LocationPicker가 열려 있는 동안에는 닫지 않습니다");
          return;
        }
        onOpenChange(next);
      }}
    >
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[9999] bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              onPointerDownOutside={(event) => {
                // LocationPicker처럼 document.body에 직접 포탈로 렌더링되는 오버레이는
                // DOM상 이 Dialog의 바깥에 있어 Radix가 "바깥 클릭"으로 오인해 시트를 닫아버립니다.
                // data-routie-overlay가 붙은 요소 안에서 발생한 클릭은 닫힘을 막습니다.
                const isRoutieOverlay = Boolean((event.target as HTMLElement | null)?.closest("[data-routie-overlay]"));
                console.log("[Routie] Sheet onPointerDownOutside", { target: event.target, isRoutieOverlay });
                if (isRoutieOverlay) {
                  event.preventDefault();
                }
              }}
              onInteractOutside={(event) => {
                const isRoutieOverlay = Boolean((event.target as HTMLElement | null)?.closest("[data-routie-overlay]"));
                console.log("[Routie] Sheet onInteractOutside", { target: event.target, isRoutieOverlay });
                if (isRoutieOverlay) {
                  event.preventDefault();
                }
              }}
            >
              <motion.div
                className={cn(
                  "fixed inset-x-0 bottom-0 z-[10000] mx-auto flex max-h-[88vh] w-full max-w-md flex-col rounded-t-lg bg-white p-5 shadow-xl focus:outline-none"
                )}
                style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 32, stiffness: 320 }}
              >
                <div className="mx-auto mb-4 h-1.5 w-10 shrink-0 rounded-full bg-muted" />
                <Dialog.Title className="mb-4 text-lg font-bold text-foreground">{title}</Dialog.Title>
                <Dialog.Description className="sr-only">{title} 시트입니다.</Dialog.Description>
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
