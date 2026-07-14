"use client";

import { useLocalStorage } from "./useLocalStorage";
import { RoutieRoutine } from "@/types/routine";

const STORAGE_KEY = "routie:routines";

/** 저장된 루티 루틴(반복 외출 템플릿) 목록입니다. 오늘 외출과 완전히 별개의 저장소라,
 * 루틴을 만들거나 지워도 실제 날짜별 일정(routie:outings)에는 영향이 없습니다. */
export function useRoutines() {
  return useLocalStorage<RoutieRoutine[]>(STORAGE_KEY, []);
}
