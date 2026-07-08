"use client";

import { motion } from "framer-motion";
import { MapPinned } from "lucide-react";

export default function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center"
    >
      <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
        <MapPinned className="h-7 w-7" />
      </div>
      <p className="text-base font-semibold text-foreground">이 날짜의 외출 일정이 없어요</p>
      <p className="text-sm text-muted-foreground">+ 버튼을 눌러 첫 장소를 추가할 수 있어요</p>
    </motion.div>
  );
}
