"use client";

import { AnimatePresence, motion } from "framer-motion";

type ToastProps = {
  message: string | null;
};

/** 화면 하단 중앙에 잠깐 떴다 사라지는 안내 문구입니다. 표시 시간은 호출하는 쪽에서
 * showToast 같은 헬퍼로 setTimeout(() => setMessage(null), ms)를 걸어 관리합니다. */
export default function Toast({ message }: ToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="fixed inset-x-0 z-30 mx-auto w-fit max-w-[90%] rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg"
          style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
