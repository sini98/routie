"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 서비스워커를 지원하지 않거나 등록에 실패해도 앱 동작에는 영향이 없습니다.
      });
    }
  }, []);

  return null;
}
