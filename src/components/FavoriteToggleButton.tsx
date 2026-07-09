"use client";

import { useState } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { generateId } from "@/lib/id";
import { Place } from "@/types/place";
import FavoriteBookmarkButton from "@/components/FavoriteBookmarkButton";
import CategoryPickerSheet from "@/components/CategoryPickerSheet";

type FavoriteToggleButtonProps = {
  place: Place;
};

/**
 * 장소 수정 시트 제목 옆에 붙는 즐겨찾기 북마크 토글입니다. 폼 제출(저장하기)과는 별개로 동작합니다.
 * 이 place가 이미 즐겨찾기인지는 좌표(위도/경도)로 판단합니다 — Place와 FavoritePlace는
 * 서로 다른 id 체계라(즐겨찾기로 저장할 때 항상 새 id를 발급) 별도의 연결 필드 없이도
 * "같은 위치"를 기준으로 매칭하는 게 가장 단순합니다.
 *
 * - 아직 즐겨찾기가 아니면(아웃라인) 누를 때 카테고리 선택 시트가 열리고, 칩을 골라 "확인"을
 *   누르면 그 카테고리로 즐겨찾기에 추가됩니다.
 * - 이미 즐겨찾기면(채워짐) 누르는 즉시 목록에서 제거됩니다(다시 카테고리를 물어보지 않습니다).
 */
export default function FavoriteToggleButton({ place }: FavoriteToggleButtonProps) {
  const [favorites, setFavorites] = useFavorites();
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);

  const existing = favorites.find((favorite) => favorite.lat === place.lat && favorite.lng === place.lng);
  const isFavorited = Boolean(existing);

  const handleClick = () => {
    if (existing) {
      setFavorites((prev) => prev.filter((favorite) => favorite.id !== existing.id));
      return;
    }
    setIsCategoryPickerOpen(true);
  };

  const handleSelectCategory = (category: string) => {
    setFavorites((prev) => [
      ...prev,
      {
        id: generateId(),
        name: place.name,
        category,
        memo: place.memo,
        lat: place.lat,
        lng: place.lng,
      },
    ]);
  };

  return (
    <>
      <FavoriteBookmarkButton
        filled={isFavorited}
        onClick={handleClick}
        ariaLabel={isFavorited ? "즐겨찾기 해제" : "즐겨찾기 등록"}
      />
      <CategoryPickerSheet
        open={isCategoryPickerOpen}
        onOpenChange={setIsCategoryPickerOpen}
        onConfirm={handleSelectCategory}
      />
    </>
  );
}
