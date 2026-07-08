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
  // subscribe로 값을 받아 setValue를 호출한 직후인지 표시합니다 — 그 경우는 이미 다른
  // 인스턴스가 localStorage에 쓰고 publish까지 마쳤으므로, 여기서 다시 쓰거나 재발행하지
  // 않습니다(무한 핑퐁 방지).
  const isExternalUpdate = useRef(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) {
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
