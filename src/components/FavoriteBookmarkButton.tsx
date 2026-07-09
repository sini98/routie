"use client";

import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

type FavoriteBookmarkButtonProps = {
  filled: boolean;
  onClick: () => void;
  ariaLabel: string;
};

/**
 * 아웃라인/채워진 북마크 순수 표시용 버튼입니다. "이미 즐겨찾기인지" 판단 로직이나 클릭 시
 * 동작(카테고리 시트 열기, 즐겨찾기 추가/제거 등)은 이 컴포넌트를 쓰는 쪽(FavoriteToggleButton,
 * OutingScreen의 장소 추가 흐름)이 각자 책임집니다 — "장소 수정"은 이미 저장된 장소라 좌표로
 * 즐겨찾기 여부를 바로 판단할 수 있지만, "장소 추가"는 아직 저장되지 않아 판단 기준이 달라서
 * 로직을 공유하기 어렵기 때문입니다. 대신 똑같이 생긴 버튼 하나만 공유합니다.
 *
 * 서비스 전체(장소 추가/수정, 저장한 장소 불러오기, 저장된 장소 목록)에서 즐겨찾기는 이
 * 아웃라인/채워진 북마크 아이콘으로 통일합니다 — 아웃라인은 저장되지 않은 상태, 채워진
 * 모양은 저장된 상태입니다.
 */
export default function FavoriteBookmarkButton({ filled, onClick, ariaLabel }: FavoriteBookmarkButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={filled}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted active:scale-95"
    >
      <Bookmark className={cn("h-5 w-5", filled ? "fill-primary text-primary" : "text-muted-foreground")} />
    </button>
  );
}
