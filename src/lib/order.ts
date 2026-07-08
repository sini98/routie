/**
 * index(0부터 시작)를 방문 순서 숫자 문자열로 변환합니다.
 * ①②③ 같은 유니코드 원문자는 숫자 자체가 작아 보여서 쓰지 않고,
 * 배지(원형 배경)는 UI 쪽에서 그리고 여기서는 순수 숫자만 반환합니다.
 */
export function getOrderBadge(index: number): string {
  return String(index + 1);
}
