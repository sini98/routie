"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/time";

type ScheduleStatusBarProps = {
  placeCount: number;
  updatedAt: number | undefined;
};

/** 화면 맨 아래에 항상 붙어 있는(스크롤과 무관한) 보조 정보 바입니다 — 장소 추가(+) 버튼
 * 바로 아래에 위치합니다. 카드나 박스처럼 보이지 않도록 배경/테두리/그림자를 전혀 쓰지
 * 않고, 페이지 배경과 같은 색 위에 텍스트만 놓습니다. 왼쪽엔 총 장소 개수, 오른쪽엔
 * 최근 수정 시각을 보여줍니다. 좌우 여백은 지도 영역(전체 폭, 좌우 패딩 없음)의 좌우
 * 끝과 값을 맞춰서, 이 텍스트의 좌우 끝이 지도의 좌우 끝과 같은 기준선에 놓이게 합니다. */
export default function ScheduleStatusBar({ placeCount, updatedAt }: ScheduleStatusBarProps) {
  const [, forceRerender] = useState(0);

  useEffect(() => {
    if (!updatedAt) return;
    // "방금 전" → "1분 전"처럼 문구가 시간에 따라 자연스럽게 갱신되도록 30초마다 다시 렌더링합니다.
    const interval = setInterval(() => forceRerender((tick) => tick + 1), 30_000);
    return () => clearInterval(interval);
  }, [updatedAt]);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex h-9 w-full max-w-md items-center justify-between bg-background px-0 text-xs text-muted-foreground"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <span>총 {placeCount}곳</span>
      <span>{updatedAt ? `최근 수정: ${formatRelativeTime(updatedAt, Date.now())}` : "아직 저장된 변경 사항이 없어요"}</span>
    </div>
  );
}
