"use client";

import { useEffect, useRef, useState } from "react";
import { notifySaved } from "@/lib/saveStatus";

// useLocalStorage(key, ...)를 호출하는 각 컴포넌트는 그동안 서로 완전히 독립된 React
// state였습니다 — 같은 key를 써도 한쪽에서 저장한 값을 다른 쪽이 자동으로 알지 못했습니다.
// (실제로 이 문제로 겪은 버그: OutingScreen이 현재 위치로 defaultRegion을 새로 저장해도
// NaverMap이 들고 있던 예전 값을 계속 써서, 위치 권한을 허용했는데도 지도가 이전에 검색했던
// 지역에 멈춰 있었습니다.) 이 모듈 전역 pub/sub으로 같은 key를 쓰는 모든 인스턴스에 변경을
// 즉시 브로드캐스트합니다.
type Listener<T> = (value: T) => void;
const listeners = new Map<string, Set<Listener<unknown>>>();

function subscribe<T>(key: string, listener: Listener<T>) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  const set = listeners.get(key)!;
  set.add(listener as Listener<unknown>);
  return () => {
    set.delete(listener as Listener<unknown>);
  };
}

function publish<T>(key: string, value: T) {
  listeners.get(key)?.forEach((listener) => listener(value));
}

/**
 * localStorage와 동기화되는 state 훅.
 * SSR 시점에는 initialValue를 사용하고, 클라이언트에서 마운트된 뒤 저장된 값을 읽어옵니다.
 * isLoaded가 true가 되기 전에는 값을 저장하지 않아, 로드 전 initialValue로 덮어쓰는 것을 방지합니다.
 * 같은 key를 쓰는 다른 컴포넌트가 값을 바꾸면(다른 useLocalStorage 인스턴스라도) 이 훅도
 * 같은 렌더 사이클 안에서 즉시 최신 값으로 갱신됩니다.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  // subscribe로 값을 받았거나(다른 인스턴스가 이미 저장을 마침), 마운트 시점에 localStorage에서
  // 막 읽어온 직후(그 값을 그대로 다시 쓸 필요가 없음)인지 표시합니다. 이 두 경우 모두 여기서
  // 다시 쓰거나 재발행하지 않습니다.
  //
  // 이 플래그가 "구독으로 받은 값"에만 걸려 있던 예전 버전에는 실제 버그가 있었습니다: 같은
  // key를 쓰는 여러 인스턴스(예: 즐겨찾기 페이지 자신 + useCategories가 내부적으로 쓰는
  // 또 하나의 useFavorites)가 마운트될 때, 각 인스턴스가 "막 읽어온 값을 로컬 state에
  // 반영"하는 것도 값이 바뀐 것으로 잡혀 write effect가 다시 실행되고, isExternalUpdate가
  // false이니 "새로 바뀐 값"이라 착각해 그 값을 localStorage에 그대로 다시 씁니다. 문제는 두
  // 인스턴스의 마운트/재실행 순서가 겹치면, 다른 인스턴스가 방금 실제로 삭제/수정해 저장한
  // 최신 값을, 이 인스턴스가 마운트 시점에 읽어뒀던(그보다 오래된) 값으로 되돌려 써버릴 수
  // 있었다는 점입니다 — 특정 항목을 삭제해도 새로고침하면 다시 나타나는 버그의 원인이었습니다.
  const isExternalUpdate = useRef(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        // 방금 localStorage에서 그대로 읽어온 값이라, 이 값을 다시 localStorage에 쓸 필요가
        // 없습니다 — 오히려 그사이 다른 인스턴스가 저장해둔 더 최신 값을 이 오래된 값으로
        // 덮어쓰는 사고로 이어질 수 있어(위 설명 참고), 구독으로 받은 값과 동일하게 취급합니다.
        isExternalUpdate.current = true;
        setValue(JSON.parse(stored) as T);
      }
    } catch (error) {
      console.error(`Failed to read localStorage key "${key}":`, error);
    } finally {
      setIsLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    return subscribe<T>(key, (nextValue) => {
      isExternalUpdate.current = true;
      setValue(nextValue);
    });
  }, [key]);

  useEffect(() => {
    if (!isLoaded) return;
    if (isExternalUpdate.current) {
      isExternalUpdate.current = false;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      notifySaved();
      publish(key, value);
    } catch (error) {
      console.error(`Failed to write localStorage key "${key}":`, error);
    }
  }, [key, value, isLoaded]);

  return [value, setValue, isLoaded] as const;
}
