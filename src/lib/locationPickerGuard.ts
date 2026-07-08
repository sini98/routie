/**
 * LocationPicker(document.body에 포탈로 렌더링되는 Radix Dialog)가 열려 있는 동안,
 * 상위 PlaceForm Bottom Sheet의 Radix Dialog가 지도/검색창 클릭을 "바깥 클릭"으로 오인해
 * 스스로를 닫아버리는 경우가 있어(→ Sheet가 닫히면 PlaceForm까지 통째로 언마운트되어 위치
 * 선택 자체가 무의미해집니다), 그런 onOpenChange(false) 요청을 무시하도록 모듈 전역
 * 플래그로 가드합니다. Radix 내부 동작 방식에 의존하지 않는 확실한 방어선입니다.
 *
 * (포커스 트랩 문제는 LocationPicker를 Radix Dialog로 만들어 "중첩된 레이어"로 등록되게
 * 하는 방식으로 해결했습니다 — LocationPicker.tsx 참고. 이 가드는 그와 별개인 outside-click
 * 방어선입니다.)
 */
let openCount = 0;

export function markLocationPickerOpen() {
  openCount += 1;
}

export function markLocationPickerClosed() {
  openCount = Math.max(0, openCount - 1);
}

export function isLocationPickerOpen() {
  return openCount > 0;
}
