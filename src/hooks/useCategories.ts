"use client";

import { useLocalStorage } from "./useLocalStorage";
import { useFavorites } from "./useFavorites";
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY } from "@/types/category";

const STORAGE_KEY = "routie:categories";

/**
 * 즐겨찾기 카테고리 목록(기본값 + 사용자가 추가한 것)을 관리합니다. "기타"를 제외한 모든
 * 카테고리는 이름 수정/삭제가 가능합니다. 카테고리를 삭제하면, 그 카테고리를 쓰던 즐겨찾기는
 * 자동으로 "기타"로 옮겨집니다(즐겨찾기 자체는 지우지 않습니다). 이름을 바꾸면 그 카테고리를
 * 쓰던 즐겨찾기도 함께 새 이름으로 옮겨갑니다. "기타"는 삭제된 카테고리의 즐겨찾기가 갈 곳이
 * 항상 있어야 하는 기본 카테고리라, 저장 여부와 무관하게 목록에 항상 포함되고 삭제할 수
 * 없습니다 — 다만 순서는 다른 카테고리와 동일하게 드래그로 바꿀 수 있습니다(reorderCategories).
 */
export function useCategories() {
  const [storedCategories, setCategories, isLoaded] = useLocalStorage<string[]>(STORAGE_KEY, DEFAULT_CATEGORIES);
  const [favorites, setFavorites] = useFavorites();

  // 즐겨찾기 화면에서 쓰이는 카테고리 목록(favoriteGroups.ts로 묶어서 보여주는 것)과
  // 장소 추가/수정 화면에서 고를 수 있는 카테고리 목록(이 categories)을 화면별로 따로
  // 관리하지 않기 위해, 실제로 즐겨찾기에 쓰이고 있는데 저장된 목록엔 없는 카테고리(예:
  // 예전 시드 데이터나 다른 경로로 들어온 값)가 있으면 항상 이 목록에 합쳐 넣습니다 —
  // 그래야 즐겨찾기 화면에 보이는 카테고리가 장소 추가/수정 화면에서도 똑같이 선택됩니다.
  // "기타"도 언제나 포함시켜서, 저장된 목록에 아직 없더라도(예: 기존 사용자 데이터) 항상
  // 기본 카테고리로 보이고 선택할 수 있게 합니다.
  const usedCategories = favorites
    .map((favorite) => favorite.category?.trim())
    .filter((category): category is string => Boolean(category));
  const categories = Array.from(new Set([...storedCategories, ...usedCategories, FALLBACK_CATEGORY]));

  const addCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    setCategories((prev) => [...prev, trimmed]);
  };

  const removeCategory = (name: string) => {
    // "기타"는 삭제된 카테고리의 즐겨찾기가 옮겨갈 기본 카테고리라, 삭제할 수 없습니다.
    if (name === FALLBACK_CATEGORY) return;
    setCategories((prev) => prev.filter((category) => category !== name));
    setFavorites((prev) =>
      prev.map((favorite) => (favorite.category === name ? { ...favorite, category: FALLBACK_CATEGORY } : favorite))
    );
  };

  const renameCategory = (oldName: string, newName: string) => {
    if (oldName === FALLBACK_CATEGORY) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName || categories.includes(trimmed)) return;
    setCategories((prev) => prev.map((category) => (category === oldName ? trimmed : category)));
    setFavorites((prev) =>
      prev.map((favorite) => (favorite.category === oldName ? { ...favorite, category: trimmed } : favorite))
    );
  };

  // 즐겨찾기 화면에서 카테고리 카드를 드래그해 순서를 바꿀 때 씁니다. "기타"는 삭제는 안
  // 되지만 순서는 다른 카테고리와 똑같이 바꿀 수 있어서, nextOrder에 그대로 포함해 넘기면
  // 됩니다 — 저장된 순서 그대로 새로고침 후에도 유지됩니다.
  const reorderCategories = (nextOrder: string[]) => {
    setCategories(nextOrder);
  };

  return { categories, addCategory, removeCategory, renameCategory, reorderCategories, isLoaded };
}
