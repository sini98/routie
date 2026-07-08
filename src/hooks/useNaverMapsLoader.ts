"use client";

import { useEffect, useState } from "react";

const SCRIPT_ID = "naver-map-sdk";

export type NaverMapsLoadStatus = "loading" | "ready" | "error";

/**
 * 네이버 지도 SDK 스크립트를 한 번만 로드하고 로딩 상태를 알려주는 훅.
 * 이미 다른 곳에서 로드된 스크립트가 있으면 재사용합니다.
 */
export function useNaverMapsLoader(): NaverMapsLoadStatus {
  const [status, setStatus] = useState<NaverMapsLoadStatus>(() => {
    if (typeof window !== "undefined" && window.naver?.maps) return "ready";
    return "loading";
  });

  useEffect(() => {
    if (status === "ready") return;

    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    if (!clientId) {
      setStatus("error");
      return;
    }

    if (window.naver?.maps) {
      setStatus("ready");
      return;
    }

    const handleLoad = () => setStatus("ready");
    const handleError = () => setStatus("error");

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", handleLoad);
      existingScript.addEventListener("error", handleError);
      return () => {
        existingScript.removeEventListener("load", handleLoad);
        existingScript.removeEventListener("error", handleError);
      };
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    script.async = true;
    script.onload = handleLoad;
    script.onerror = handleError;
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return status;
}
