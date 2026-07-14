import { Place } from "./place";

/**
 * 반복적으로 쓰는 외출 템플릿입니다. 장소와 방문 순서만 저장합니다 — 출발 시간/이동수단은
 * 그날그날 달라질 수 있어서 루틴에는 담지 않고, 이 루틴을 불러와 오늘 외출을 만드는
 * 시점에 다시 고릅니다(RoutinePickerSheet 참고).
 */
export type RoutieRoutine = {
  id: string;
  name: string;
  places: Place[];
};
