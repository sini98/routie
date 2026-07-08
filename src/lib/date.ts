/** Date를 로컬 기준 YYYY-MM-DD 키로 변환합니다 (UTC 변환으로 인한 날짜 오차 방지). */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayDateString(): string {
  return toDateKey(new Date());
}

/** "YYYY-MM-DD" -> 로컬 타임존 기준 Date (UTC 파싱으로 인한 요일 오차 방지) */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateLabel(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

/** "YYYY-MM-DD"에서 delta일만큼 이동한 날짜 키를 반환합니다 (delta는 음수 가능). */
export function addDaysToKey(dateKey: string, delta: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + delta);
  return toDateKey(date);
}
