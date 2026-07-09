"use client";

import { useLocalStorage } from "./useLocalStorage";
import { generateId } from "@/lib/id";
import { FavoritePlace, MOCK_FAVORITES } from "@/types/favorite";

const STORAGE_KEY = "routie:favorites";

// id가 없거나(레거시 데이터) 같은 id를 공유하는 즐겨찾기가 남아있으면, 목록의 key와 삭제
// 필터가 모두 id 기준이라 특정 항목이 삭제되지 않는 것처럼 보일 수 있습니다. 읽어올 때마다
// id 없는 항목엔 새 id를 채우고, 같은 id가 중복되면 먼저 나온 것만 남깁니다.
function normalizeFavorites(favorites: FavoritePlace[]): FavoritePlace[] {
  const seenIds = new Set<string>();
  const result: FavoritePlace[] = [];
  for (const favorite of favorites) {
    const id = favorite.id || generateId();
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    result.push(favorite.id ? favorite : { ...favorite, id });
  }
  return result;
}

/**
 * 즐겨찾기 장소 목록. 최초 진입 시 예시 데이터로 한 번 시딩되고,
 * 이후에는 사용자가 저장/삭제한 내용이 그대로 LocalStorage에 유지됩니다.
 */
export function useFavorites() {
  const [favorites, setFavorites, isLoaded] = useLocalStorage<FavoritePlace[]>(STORAGE_KEY, MOCK_FAVORITES);
  return [normalizeFavorites(favorites), setFavorites, isLoaded] as const;
}
