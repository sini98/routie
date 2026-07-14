"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { isLocationPickerOpen } from "@/lib/locationPickerGuard";

const SHEET_MAX_HEIGHT = "88vh";
const SHEET_MAX_HEIGHT_EXPANDED = "94vh";
// 핸들을 이만큼(px) 넘게 위/아래로 끌어야 상태가 바뀝니다. 너무 작으면 살짝 스친 것도
// 확장/축소로 오인하고, 너무 크면 의도한 드래그도 무시됩니다.
const DRAG_THRESHOLD = 48;

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** 제목 왼쪽에 붙는 뒤로가기 버튼(예: 저장한 장소 불러오기 → 장소 추가로 복귀). 없으면
   * 기존과 동일하게 제목이 맨 앞부터 시작합니다. */
  onBack?: () => void;
  /** 제목 오른쪽에 붙는 액션(예: 즐겨찾기 별 토글). 없으면 기존과 동일하게 제목만 표시됩니다. */
  titleAction?: ReactNode;
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
export function Sheet({ open, onOpenChange, title, onBack, titleAction, children }: SheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 시트를 새로 열 때마다 항상 기본 높이로 시작합니다 — 이전에 확장한 채로 닫았어도
  // 다음에 열 때는 확장 상태가 남아있지 않습니다.
  useEffect(() => {
    if (open) setIsExpanded(false);
  }, [open]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -DRAG_THRESHOLD) {
      setIsExpanded(true);
    } else if (info.offset.y > DRAG_THRESHOLD) {
      if (isExpanded) {
        setIsExpanded(false);
      } else {
        onOpenChange(false);
      }
    }
  };

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
                  "fixed inset-x-0 bottom-0 z-[10000] mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-t-lg bg-white shadow-xl focus:outline-none"
                )}
                initial={{ y: "100%", maxHeight: SHEET_MAX_HEIGHT }}
                animate={{ y: 0, maxHeight: isExpanded ? SHEET_MAX_HEIGHT_EXPANDED : SHEET_MAX_HEIGHT }}
                exit={{ y: "100%" }}
                transition={{
                  y: { type: "spring", damping: 32, stiffness: 320 },
                  maxHeight: { duration: 0.25, ease: "easeOut" },
                }}
              >
                <div className="flex shrink-0 flex-col px-5 pt-5">
                  {/* 실제로 보이는 알약(h-1.5 w-10)보다 드래그로 잡을 수 있는 영역(h-5 w-16)을
                      더 넉넉하게 잡아서, 디자인은 그대로 두면서 손가락으로 잡기 쉽게 했습니다. */}
                  <motion.div
                    className="mx-auto mb-4 flex h-5 w-16 shrink-0 cursor-grab items-center justify-center active:cursor-grabbing"
                    style={{ touchAction: "none" }}
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.5}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="h-1.5 w-10 rounded-full bg-muted" />
                  </motion.div>
                  <div className="mb-4 flex items-center gap-2">
                    {onBack && (
                      <button
                        type="button"
                        onClick={onBack}
                        aria-label="뒤로가기"
                        className="-ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                    )}
                    <Dialog.Title className="min-w-0 flex-1 truncate text-lg font-bold text-foreground">
                      {title}
                    </Dialog.Title>
                    {titleAction}
                  </div>
                </div>
                <Dialog.Description className="sr-only">{title} 시트입니다.</Dialog.Description>
                {/* 헤더(핸들+제목)는 고정, 이 영역만 세로 스크롤 — 드래그 핸들의 리사이즈
                    제스처와 이 안의 스크롤 제스처는 서로 다른 요소라 충돌하지 않습니다. */}
                <div
                  className="min-h-0 flex-1 overflow-y-auto px-5"
                  style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
                >
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
