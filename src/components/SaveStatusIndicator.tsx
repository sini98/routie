"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getLastSavedAt, subscribeSaved } from "@/lib/saveStatus";
import { formatRelativeTime } from "@/lib/time";

/**
 * 저장 버튼 없이 LocalStorage에 자동 저장되고 있음을 알려주는 작은 상태 문구입니다.
 * useLocalStorage가 실제로 값을 쓸 때마다 src/lib/saveStatus.ts의 전역 저장소가 갱신되고,
 * 여기서는 그 시각을 구독해서 "N분 전"처럼 상대 시간으로 보여줍니다. 저장이 아직 한 번도
 * 일어나지 않았다면(로딩 전) 아무것도 표시하지 않습니다.
 */
export default function SaveStatusIndicator() {
  const lastSavedAt = useSyncExternalStore(subscribeSaved, getLastSavedAt, () => null);
  const [, forceRerender] = useState(0);

  useEffect(() => {
    if (!lastSavedAt) return;
    // 새로 저장되지 않아도 "방금 전" → "1분 전"처럼 문구가 시간에 따라 자연스럽게 갱신되도록
    // 30초마다 다시 렌더링합니다.
    const interval = setInterval(() => forceRerender((tick) => tick + 1), 30_000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  return (
    // FAB(오른쪽 하단 + 버튼, right-5/1.25rem 폭 3.5rem)과 같은 높이에 놓되, 겹치지 않도록
    // FAB 왼쪽에 여백(0.75rem)을 두고 배치합니다. 화면 가장자리(오른쪽/아래) 여백은 FAB와
    // 동일한 값을 그대로 써서 서로 자연스럽게 한 줄에 정렬됩니다.
    <div
      className="pointer-events-none fixed z-20 flex h-14 items-center"
      style={{ right: "5.5rem", bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      <AnimatePresence>
        {lastSavedAt && (
          <motion.p
            key="save-status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="whitespace-nowrap text-[11px] text-muted-foreground"
          >
            마지막 저장: {formatRelativeTime(lastSavedAt, Date.now())}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
