"use client";

import { useNaverMapsLoader } from "@/hooks/useNaverMapsLoader";

/**
 * 앱 어디를 들어오든(홈 화면 포함) 네이버 지도 SDK 스크립트를 최대한 미리 로드해두기 위한
 * 컴포넌트입니다. useNaverMapsLoader는 script id로 중복 로드를 막기 때문에, 실제로 지도
 * 화면(오늘/지정 외출, 장소 추가)에 들어갔을 때 호출되는 useNaverMapsLoader는 이미 로드된
 * (또는 로드 중인) 같은 스크립트 태그를 재사용합니다 — 즉 사용자가 "오늘 외출"을 누르는
 * 시점에는 SDK가 이미 다운로드돼 있거나 거의 끝나가는 상태라, 지도 진입 체감 속도가
 * 눈에 띄게 빨라집니다. 이 컴포넌트 자체는 로딩 상태를 화면에 표시하지 않습니다(화면을
 * 그리지 않는 조용한 프리로더 — RegionSetup.tsx와 같은 패턴).
 */
export default function NaverMapsPreloader() {
  useNaverMapsLoader();
  return null;
}
