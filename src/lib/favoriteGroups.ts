import { FavoritePlace } from "@/types/favorite";
import { FALLBACK_CATEGORY } from "@/types/category";

export type FavoriteGroup = { category: string; favorites: FavoritePlace[] };

/**
 * 즐겨찾기를 카테고리별로 묶습니다. 검색으로 저장했든 지도에서 직접 찍어 저장했든
 * favorite.category만 보고 묶으므로 저장 경로와 무관하게 동일하게 분류됩니다.
 *
 * - category가 없거나 빈 문자열이면(카테고리 기능이 생기기 전에 저장된 예전 데이터 포함)
 *   항상 "기타"로 취급합니다 — 기존 데이터가 깨지지 않습니다.
 * - 그룹 순서는 현재 카테고리 목록(knownCategories) 순서를 그대로 따릅니다. "기타"도 다른
 *   카테고리와 동일하게 사용자가 드래그로 옮긴 위치에 나타납니다(항상 맨 뒤로 고정되지
 *   않습니다). knownCategories에 없는 카테고리 값(예: 삭제된 적 있는 카테고리 이름이
 *   남아있는 경우)만 등장한 이름 그대로 맨 뒤에 덧붙여 데이터가 조용히 안 보이는 일이
 *   없게 합니다.
 * - 사용자가 만든 카테고리와 "기타"(둘 다 knownCategories에 항상 포함됨)는 그 안에
 *   즐겨찾기가 하나도 없어도 항상 보여줍니다 — 카테고리를 막 만들었을 때 장소를 넣기
 *   전에는 안 보이던 문제를 막기 위해서입니다. knownCategories에 없는 이름(삭제된 적
 *   있는 카테고리 등)만 실제로 그 이름을 쓰는 즐겨찾기가 있을 때만 보여줍니다.
 */
export function groupFavoritesByCategory(favorites: FavoritePlace[], knownCategories: string[]): FavoriteGroup[] {
  const buckets = new Map<string, FavoritePlace[]>();
  for (const favorite of favorites) {
    const key = favorite.category?.trim() || FALLBACK_CATEGORY;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(favorite);
  }

  const orderedNames = [
    ...knownCategories,
    ...Array.from(buckets.keys()).filter((name) => !knownCategories.includes(name)),
  ];

  const knownSet = new Set(knownCategories);
  const seen = new Set<string>();
  const groups: FavoriteGroup[] = [];
  for (const name of orderedNames) {
    if (seen.has(name)) continue;
    seen.add(name);
    const items = buckets.get(name) ?? [];
    if (items.length > 0 || knownSet.has(name)) {
      groups.push({ category: name, favorites: items });
    }
  }
  return groups;
}
