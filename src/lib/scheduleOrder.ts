import { Place } from "@/types/place";

/**
 * 시간이 설정된 장소를 "적절한 위치"에 끼워 넣습니다 — 전체 목록을 다시 정렬하는 게
 * 아니라, 현재 순서(드래그로 바뀐 순서 포함)는 그대로 둔 채 이 장소 하나만 자리를 찾아
 * 넣습니다. 그래서 사용자가 드래그로 순서를 바꿔둔 뒤에 새 장소를 추가해도, 기존 카드들의
 * 순서는 건드리지 않습니다.
 *
 * 규칙:
 * - 시간이 없으면 항상 맨 뒤에 추가합니다(추가한 순서를 그대로 유지).
 * - 시간이 있으면, 자신보다 "더 늦은" 첫 번째 장소 바로 앞에 끼워 넣습니다. 시간이 없는
 *   장소는 항상 "더 늦은" 것으로 취급합니다(시간 있는 장소들이 항상 그 위에 오도록).
 * - 같은 시간의 장소가 이미 있으면 그 뒤에 붙습니다(같은 시간끼리는 먼저 추가된 순서 유지).
 */
export function insertPlaceByTime(places: Place[], newPlace: Place): Place[] {
  if (!newPlace.time) {
    return [...places, newPlace];
  }

  const insertIndex = places.findIndex((place) => !place.time || place.time > newPlace.time!);

  if (insertIndex === -1) {
    return [...places, newPlace];
  }

  return [...places.slice(0, insertIndex), newPlace, ...places.slice(insertIndex)];
}
