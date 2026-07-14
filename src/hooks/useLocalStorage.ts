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
// 리스너를 key -> (인스턴스 id -> listener) 맵으로 관리합니다. publish가 "이 값을 방금
// 저장한 바로 그 인스턴스"는 건너뛰어야 하기 때문에 id가 필요합니다 — Set이었을 때는
// 이 구분이 없어서, 한 인스턴스가 저장한 뒤 publish가 자기 자신의 구독 콜백까지 불러
// isExternalUpdate 플래그를 스스로 true로 만들어버렸고, 그 인스턴스의 바로 다음 변경은
// (실제로는 로컬 변경인데) "외부에서 온 값"으로 오인되어 저장이 통째로 건너뛰어졌습니다
// (추가/삭제가 "한 번만" 되고 그다음부터 안 먹히던 버그의 원인).
const listeners = new Map<string, Map<symbol, Listener<unknown>>>();

function subscribe<T>(key: string, instanceId: symbol, listener: Listener<T>) {
  if (!listeners.has(key)) listeners.set(key, new Map());
  const map = listeners.get(key)!;
  map.set(instanceId, listener as Listener<unknown>);
  return () => {
    map.delete(instanceId);
  };
}

function publish<T>(key: string, value: T, sourceId: symbol) {
  listeners.get(key)?.forEach((listener, id) => {
    if (id !== sourceId) listener(value);
  });
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
  // 이 훅 인스턴스를 다른 인스턴스와 구분하기 위한 고유 id입니다(publish가 자기 자신은
  // 건너뛰기 위해 씁니다). useRef(Symbol())은 매 렌더마다 Symbol()을 새로 만들긴 하지만
  // useRef는 최초 렌더의 값만 실제로 유지하므로 인스턴스당 하나로 고정됩니다.
  const instanceId = useRef(Symbol("useLocalStorage")).current;
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
    return subscribe<T>(key, instanceId, (nextValue) => {
      isExternalUpdate.current = true;
      setValue(nextValue);
    });
  }, [key, instanceId]);

  useEffect(() => {
    if (!isLoaded) return;
    if (isExternalUpdate.current) {
      isExternalUpdate.current = false;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      notifySaved();
      publish(key, value, instanceId);
    } catch (error) {
      console.error(`Failed to write localStorage key "${key}":`, error);
    }
  }, [key, value, isLoaded, instanceId]);

  return [value, setValue, isLoaded] as const;
}
