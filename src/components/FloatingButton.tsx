"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

type FloatingButtonProps = {
  onClick: () => void;
  ariaLabel?: string;
  /** 화면 하단에 이 버튼 말고 다른 고정 요소(예: 정보 바)가 더 있어서 기본 여백보다
   * 위로 띄워야 할 때만 지정합니다. 기본값은 기존과 동일합니다. */
  bottomOffset?: string;
};

export default function FloatingButton({
  onClick,
  ariaLabel = "장소 추가",
  bottomOffset = "max(1.5rem, env(safe-area-inset-bottom))",
}: FloatingButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      style={{ bottom: bottomOffset }}
      className="fixed right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40"
    >
      <Plus className="h-7 w-7" />
    </motion.button>
  );
}
