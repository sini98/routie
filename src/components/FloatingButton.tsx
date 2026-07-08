"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

type FloatingButtonProps = {
  onClick: () => void;
};

export default function FloatingButton({ onClick }: FloatingButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="장소 추가"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      className="fixed right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40"
    >
      <Plus className="h-7 w-7" />
    </motion.button>
  );
}
