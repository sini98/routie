/**
 * 저장/수정 시각을 사람이 읽기 쉬운 상대 시간 문구로 바꿉니다.
 * 방금 전 → N분 전 → N시간 전 → 어제 → N일 전(6일까지) → 그 이후는 날짜(월 일)로 표시합니다.
 */
export function formatRelativeTime(timestamp: number, now: number): string {
  const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (diffSeconds < 60) return "방금 전";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;

  return new Date(timestamp).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}
