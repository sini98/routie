"use client";

import { useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { Place } from "@/types/place";
import { TransportMode } from "@/types/transport";
import { addDaysToKey, formatDateLabel, getTodayDateString } from "@/lib/date";
import { generateId } from "@/lib/id";

/** 하루치 일정 하나 — 제목(선택), 장소 목록, 마지막으로 저장된 시각(ms). departureTime/
 * transport는 루티 루틴을 불러와 오늘 외출을 만들 때만 선택적으로 채워집니다 — 루틴
 * 자체에는 저장되지 않고, 그날 실제로 쓸 값만 이 일정 하나에 담습니다. */
export type OutingEntry = {
  title: string | null;
  places: Place[];
  updatedAt: number;
  departureTime?: string;
  transport?: TransportMode;
};

/** 날짜(YYYY-MM-DD)를 key로 하는 일정 저장 구조 */
export type OutingMap = Record<string, OutingEntry>;

const STORAGE_KEY = "routie:outings";

// 이전 버전은 날짜별로 Place[]만 저장했습니다(제목/저장시각 없음). 그 데이터를 잃지 않도록
// 읽을 때 제목 없음 + 저장시각 0으로 감싸 새 shape(OutingEntry)로 변환합니다.
type StoredOutingValue = Place[] | Partial<OutingEntry>;
type StoredOutingMap = Record<string, StoredOutingValue>;

// 아주 오래된 데이터나 예기치 못한 이유로 id가 없거나(레거시 데이터) 같은 id를 공유하는
// 장소가 남아있으면, key/필터가 모두 id 기준이라 카드가 안 지워지는 것처럼 보일 수 있습니다.
// 읽어올 때마다 id 없는 장소엔 새 id를 채우고, 같은 id가 중복되면 먼저 나온 것만 남깁니다.
function normalizePlaces(places: Place[]): Place[] {
  const seenIds = new Set<string>();
  const result: Place[] = [];
  for (const place of places) {
    const id = place.id || generateId();
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    result.push(place.id ? place : { ...place, id });
  }
  return result;
}

function normalizeEntry(value: StoredOutingValue): OutingEntry {
  if (Array.isArray(value)) {
    return { title: null, places: normalizePlaces(value), updatedAt: 0 };
  }
  return {
    title: value.title ?? null,
    places: normalizePlaces(value.places ?? []),
    updatedAt: value.updatedAt ?? 0,
    departureTime: value.departureTime,
    transport: value.transport,
  };
}

/** 날짜별 일정 전체 맵을 그대로 다루고 싶을 때 사용합니다 (예: 달력 화면, 홈 화면 최근 일정). */
export function useOutingsMap() {
  const [rawOutings, setRawOutings, isLoaded] = useLocalStorage<StoredOutingMap>(STORAGE_KEY, {});

  const outings = useMemo<OutingMap>(() => {
    const normalized: OutingMap = {};
    for (const [date, value] of Object.entries(rawOutings)) {
      normalized[date] = normalizeEntry(value);
    }
    return normalized;
  }, [rawOutings]);

  const setOutings = (updater: OutingMap | ((prev: OutingMap) => OutingMap)) => {
    setRawOutings((prevRaw) => {
      const prevNormalized: OutingMap = {};
      for (const [date, value] of Object.entries(prevRaw)) {
        prevNormalized[date] = normalizeEntry(value);
      }
      return typeof updater === "function" ? (updater as (prev: OutingMap) => OutingMap)(prevNormalized) : updater;
    });
  };

  return [outings, setOutings, isLoaded] as const;
}

/**
 * 특정 날짜의 일정만 다루고 싶을 때 사용합니다 (예: 오늘/지정 외출 화면).
 * 예전에는 오늘 날짜에 처음 들어오면 예시 장소(INITIAL_PLACES) 3곳을 자동으로 채워 넣었는데,
 * 그러면 "장소가 하나도 없을 때 현재 위치를 기준으로 시작"하는 로직이 사실상 항상 건너뛰어지고
 * (예시 장소가 이미 있으니까), localStorage를 지워도 매번 예시 데이터가 다시 채워져 현재
 * 위치 기준 동작을 테스트하기 어려웠습니다. 지금은 자동으로 아무것도 채우지 않습니다 —
 * 정말 장소가 없으면 EmptyState가 뜨고, 오늘 외출이면 useAutoLocate가 현재 위치를 기준으로
 * 지도를 보여줍니다.
 */
export function useOuting(date: string) {
  const [outings, setOutings, isLoaded] = useOutingsMap();

  const entry = outings[date];
  const places = entry?.places ?? [];
  const title = entry?.title ?? null;
  const departureTime = entry?.departureTime;
  const transport = entry?.transport;
  const updatedAt = entry?.updatedAt;

  const setPlaces = (updater: Place[] | ((prev: Place[]) => Place[])) => {
    setOutings((prev) => {
      const current = prev[date]?.places ?? [];
      const next = typeof updater === "function" ? (updater as (prev: Place[]) => Place[])(current) : updater;
      return { ...prev, [date]: { ...prev[date], title: prev[date]?.title ?? null, places: next, updatedAt: Date.now() } };
    });
  };

  /** 일정 제목을 수동으로 붙이거나(문자열) 지웁니다(null → 날짜 기반 기본 제목으로 표시). */
  const setTitle = (nextTitle: string | null) => {
    setOutings((prev) => ({
      ...prev,
      [date]: { ...prev[date], title: nextTitle, places: prev[date]?.places ?? [], updatedAt: Date.now() },
    }));
  };

  /** 루티 루틴을 불러올 때만 씁니다 — 그날 실제로 쓸 출발 시간/이동수단을 이 일정 하나에 담습니다. */
  const setDepartureInfo = (nextDepartureTime: string, nextTransport: TransportMode) => {
    setOutings((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        title: prev[date]?.title ?? null,
        places: prev[date]?.places ?? [],
        updatedAt: Date.now(),
        departureTime: nextDepartureTime,
        transport: nextTransport,
      },
    }));
  };

  return { places, title, departureTime, transport, updatedAt, setPlaces, setTitle, setDepartureInfo, isLoaded };
}

export type RecentOuting = {
  date: string;
  title: string;
  updatedAt: number;
  placeCount: number;
};

// 일정은 날짜별로 하나만 존재할 수 있으므로, 복제본은 내용이 없는(비어 있거나 아예 없는)
// 가장 가까운 미래 날짜를 찾아 그 자리에 저장합니다. 오늘 날짜는 이미 쓰고 있을 가능성이
// 높아 내일부터 찾습니다.
function findNextAvailableDate(outings: OutingMap): string {
  let candidate = addDaysToKey(getTodayDateString(), 1);
  while ((outings[candidate]?.places.length ?? 0) > 0) {
    candidate = addDaysToKey(candidate, 1);
  }
  return candidate;
}

/**
 * 홈 화면 "최근 작성한 일정" 목록입니다. 장소가 1곳 이상 있는 일정만, 마지막 저장이
 * 최신인 순서로 보여줍니다(빈 일정은 목록을 어지럽히기만 하므로 제외합니다).
 */
export function useRecentOutings() {
  const [outings, setOutings, isLoaded] = useOutingsMap();

  const recentOutings = useMemo<RecentOuting[]>(() => {
    return Object.entries(outings)
      .filter(([, entry]) => entry.places.length > 0)
      .map(([date, entry]) => ({
        date,
        title: entry.title?.trim() ? entry.title.trim() : `${formatDateLabel(date)} 외출`,
        updatedAt: entry.updatedAt,
        placeCount: entry.places.length,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [outings]);

  /** 일정을 통째로 지웁니다. 복구 기능은 없습니다 — 호출 전 확인 UI를 거쳐야 합니다. */
  const deleteOuting = (date: string) => {
    setOutings((prev) => {
      const next = { ...prev };
      delete next[date];
      return next;
    });
  };

  /** 일정을 가까운 빈 날짜에 복제합니다. 장소 id는 새로 발급해 원본과 완전히 독립된 사본을 만듭니다. */
  const duplicateOuting = (date: string): string | null => {
    const source = outings[date];
    if (!source) return null;

    const targetDate = findNextAvailableDate(outings);
    setOutings((prev) => ({
      ...prev,
      [targetDate]: {
        title: source.title ? `${source.title} (복사본)` : null,
        places: source.places.map((place) => ({ ...place, id: generateId() })),
        updatedAt: Date.now(),
      },
    }));
    return targetDate;
  };

  return { recentOutings, isLoaded, deleteOuting, duplicateOuting };
}
