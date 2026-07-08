"use client";

import { useEffect, useState } from "react";
import { notifySaved } from "@/lib/saveStatus";

/**
 * localStorage와 동기화되는 state 훅.
 * SSR 시점에는 initialValue를 사용하고, 클라이언트에서 마운트된 뒤 저장된 값을 읽어옵니다.
 * isLoaded가 true가 되기 전에는 값을 저장하지 않아, 로드 전 initialValue로 덮어쓰는 것을 방지합니다.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

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
    if (!isLoaded) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      notifySaved();
    } catch (error) {
      console.error(`Failed to write localStorage key "${key}":`, error);
    }
  }, [key, value, isLoaded]);

  return [value, setValue, isLoaded] as const;
}
