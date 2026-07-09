"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // 개발 모드(npm run dev)에서는 서비스워커를 아예 등록하지 않는 것을 넘어, 예전에
      // (프로덕션 빌드를 로컬에서 열어봤거나, 이 가드가 생기기 전에) 이미 등록되어 브라우저에
      // 남아있을 수 있는 서비스워커/캐시까지 매번 적극적으로 정리합니다. sw.js는 모든 GET
      // 요청을 "네트워크 우선 + 실패 시 캐시 폴백"으로 캐싱하는데, 개발 중에는 저장할 때마다
      // 새 JS 청크가 생기는 반면 이미 떠 있는 서비스워커가 예전 청크를 계속 캐시로 물고
      // 있으면 새로고침해도 예전 상태로 멈춰 있거나, 더 이상 존재하지 않는 청크를 요청하다
      // 실패해서 화면이 하얗게 뜨는 문제로 이어집니다. 이 정리 로직 덕분에 한 번 새로고침만
      // 해도(개발자 도구를 열어 수동으로 지울 필요 없이) 다음 로드부터는 서비스워커 없이
      // 항상 최신 코드로만 뜹니다.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        });
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 서비스워커를 지원하지 않거나 등록에 실패해도 앱 동작에는 영향이 없습니다.
    });
  }, []);

  return null;
}
