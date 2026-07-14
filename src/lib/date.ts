/** Date를 로컬 기준 YYYY-MM-DD 키로 변환합니다 (UTC 변환으로 인한 날짜 오차 방지). */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 지금 이 순간을 한국 표준시(KST, UTC+9) 기준 Date로 변환합니다. 서버가 어떤 타임존에서
 * 돌든(Vercel은 UTC — app/api/weather/route.ts의 toKst와 같은 이유) "오늘"이 항상 한국
 * 사용자의 실제 날짜를 가리키게 하기 위해서입니다. 이 변환이 없으면 자정~오전 9시(KST) 사이,
 * 서버(UTC)의 날짜가 아직 전날이라 "오늘 외출"이 하루 전 날짜로 계산되는 문제가 있었습니다.
 * 로컬 타임존 오프셋을 걷어낸 뒤 KST 오프셋을 다시 더하는 동일한 방식입니다. */
function nowInKst(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMs + 9 * 60 * 60_000);
}

export function getTodayDateString(): string {
  return toDateKey(nowInKst());
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
