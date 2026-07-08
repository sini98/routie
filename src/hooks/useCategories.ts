"use client";

import { useLocalStorage } from "./useLocalStorage";
import { useFavorites } from "./useFavorites";
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY } from "@/types/category";

const STORAGE_KEY = "routie:categories";

/**
 * 즐겨찾기 카테고리 목록(기본값 + 사용자가 추가한 것)을 관리합니다.
 * 카테고리를 삭제하면, 그 카테고리를 쓰던 즐겨찾기는 자동으로 "기타"로 옮겨집니다
 * (즐겨찾기 자체는 지우지 않습니다).
 */
export function useCategories() {
  const [categories, setCategories, isLoaded] = useLocalStorage<string[]>(STORAGE_KEY, DEFAULT_CATEGORIES);
  const [, setFavorites] = useFavorites();

  const addCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    setCategories((prev) => [...prev, trimmed]);
  };

  const removeCategory = (name: string) => {
    setCategories((prev) => prev.filter((category) => category !== name));
    setFavorites((prev) =>
      prev.map((favorite) => (favorite.category === name ? { ...favorite, category: FALLBACK_CATEGORY } : favorite))
    );
  };

  return { categories, addCategory, removeCategory, isLoaded };
}
