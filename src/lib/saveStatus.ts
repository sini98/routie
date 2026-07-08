type Listener = () => void;

/**
 * useLocalStorage가 실제로 값을 저장할 때마다 마지막 저장 시각을 기록하는 전역 저장소입니다.
 * 여러 화면/훅에서 동시에 저장이 일어나도 "마지막 저장" 상태 문구 하나로 보여줄 수 있도록,
 * 특정 컴포넌트 트리가 아니라 모듈 전역에 둡니다.
 */
let lastSavedAt: number | null = null;
const listeners = new Set<Listener>();

export function notifySaved() {
  lastSavedAt = Date.now();
  listeners.forEach((listener) => listener());
}

export function subscribeSaved(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLastSavedAt() {
  return lastSavedAt;
}
