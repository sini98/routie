"use client";

import { useLocalStorage } from "./useLocalStorage";
import { FavoritePlace, MOCK_FAVORITES } from "@/types/favorite";

const STORAGE_KEY = "routie:favorites";

/**
 * 즐겨찾기 장소 목록. 최초 진입 시 예시 데이터로 한 번 시딩되고,
 * 이후에는 사용자가 저장/삭제한 내용이 그대로 LocalStorage에 유지됩니다.
 */
export function useFavorites() {
  return useLocalStorage<FavoritePlace[]>(STORAGE_KEY, MOCK_FAVORITES);
}
