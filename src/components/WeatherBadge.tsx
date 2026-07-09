"use client";

import { useEffect, useState } from "react";
import { DEFAULT_COORDS } from "@/types/place";

type Coords = { lat: number; lng: number };
type LocatedCoords = Coords & { source: "gps" | "fallback" | "schedule" };
type WeatherData = { temperature: number; icon: string; comment: string };
type WeatherState = { status: "loading" } | { status: "success"; data: WeatherData } | { status: "error" };

const LOG_PREFIX = "[Routie][WeatherBadge]";

// 날씨는 기상청 5km 격자 단위라 GPS급 정밀도가 필요 없고, 10분 이내의 캐시된 위치도
// 그대로 씁니다 — enableHighAccuracy를 켜면 오히려 응답이 늦어지기만 합니다.
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8_000,
  maximumAge: 10 * 60_000,
};

/** 위치 권한이 거부되었거나 GPS를 가져오지 못하면 서울(DEFAULT_COORDS)로 대체합니다. */
function getCurrentCoordsWithFallback(): Promise<LocatedCoords> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      console.warn(`${LOG_PREFIX} [GPS] 이 브라우저는 geolocation API를 지원하지 않습니다 → 서울 기본 좌표로 대체`);
      resolve({ ...DEFAULT_COORDS, source: "fallback" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        console.log(`${LOG_PREFIX} [GPS] 위치 권한 허용 + 조회 성공`, coords);
        resolve({ ...coords, source: "gps" });
      },
      (error) => {
        // error.code: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
        console.warn(`${LOG_PREFIX} [GPS] 위치 권한 거부 또는 조회 실패 → 서울 기본 좌표로 대체`, {
          code: error.code,
          message: error.message,
        });
        resolve({ ...DEFAULT_COORDS, source: "fallback" });
      },
      GEOLOCATION_OPTIONS
    );
  });
}

/** 오늘 외출은 GPS(현재 위치), 지정 외출은 그 일정의 첫 장소 좌표를 씁니다 — 지정 외출에서는
 * navigator.geolocation을 아예 호출하지 않습니다(위치 권한과 무관하게 항상 일정 위치 기준). */
function resolveCoords(isToday: boolean, scheduleLocation?: Coords): Promise<LocatedCoords> {
  if (isToday) return getCurrentCoordsWithFallback();

  if (scheduleLocation) {
    console.log(`${LOG_PREFIX} [일정 위치] 지정 외출 → 첫 장소 좌표 사용`, scheduleLocation);
    return Promise.resolve({ ...scheduleLocation, source: "schedule" });
  }

  console.warn(`${LOG_PREFIX} [일정 위치] 지정 외출인데 등록된 장소가 없음 → 서울 기본 좌표로 대체`);
  return Promise.resolve({ ...DEFAULT_COORDS, source: "fallback" });
}

type WeatherBadgeProps = {
  /** "YYYY-MM-DD". 오늘이면 기존처럼 초단기예보(현재 날씨)를, 오늘이 아니면(지정 외출)
   * 이 날짜의 단기예보를 사용합니다. */
  date: string;
  isToday: boolean;
  /** 지정 외출(오늘이 아닐 때)에 쓰는 일정 위치 — 그 날짜 일정의 첫 번째 장소 좌표입니다.
   * 오늘 외출에서는 GPS만 쓰므로 이 값을 넘기지 않아도 됩니다. */
  scheduleLocation?: Coords;
};

/** 헤더 날짜 아래에 뜨는 그 날 대표 날씨입니다. 서버(/api/weather)만 호출하고, 기상청 API는
 * 그 서버 라우트 안에서만 호출됩니다. 장소별 지역 변경 시 뜨는 카드 옆 날씨 배지와는 별개로,
 * 항상 유지됩니다. */
export default function WeatherBadge({ date, isToday, scheduleLocation }: WeatherBadgeProps) {
  const [state, setState] = useState<WeatherState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    resolveCoords(isToday, scheduleLocation).then(({ source, ...coords }) => {
      if (cancelled) return;
      console.log(`${LOG_PREFIX} [위치 확정]`, { ...coords, source, date, isToday });

      // 오늘 외출은 기존처럼 초단기예보(date 파라미터 없음), 지정 외출은 그 날짜의
      // 단기예보(date 파라미터 포함)를 요청합니다 — 서버(/api/weather)가 이 파라미터
      // 유무로 두 흐름을 분기합니다.
      const dateQuery = isToday ? "" : `&date=${date}`;
      fetch(`/api/weather?lat=${coords.lat}&lng=${coords.lng}&source=${source}${dateQuery}`)
        .then(async (response) => {
          if (!response.ok) {
            // 실패 사유를 화면에는 문구 하나로만 보여주더라도, 콘솔에는 실제 status와 응답
            // 본문(reason 등)을 남겨 원인을 바로 확인할 수 있게 합니다.
            const body = await response.text();
            console.error(`${LOG_PREFIX} [/api/weather 호출] 실패`, { status: response.status, body });
            throw new Error(`날씨 API 응답 실패 (status=${response.status})`);
          }
          console.log(`${LOG_PREFIX} [/api/weather 호출] 성공 (status=${response.status})`);
          return response.json();
        })
        .then((data: WeatherData) => {
          if (cancelled) return;
          console.log(`${LOG_PREFIX} [최종 날씨 데이터 수신] 성공`, data);
          setState({ status: "success", data });
        })
        .catch((error) => {
          console.error(`${LOG_PREFIX} [최종 날씨 데이터 수신] 실패`, error);
          if (!cancelled) setState({ status: "error" });
        });
    });

    return () => {
      cancelled = true;
    };
    // date/isToday가 바뀌면(이전/다음 날짜 이동 등) 그 날짜에 맞는 예보를 다시 요청합니다.
    // scheduleLocation은 객체 참조 대신 lat/lng 값 자체로 비교해, 상위에서 매 렌더마다
    // 새 객체를 넘기더라도 실제 좌표가 그대로면 다시 요청하지 않습니다.
  }, [date, isToday, scheduleLocation?.lat, scheduleLocation?.lng]);

  if (state.status === "loading") {
    return <p className="truncate text-xs text-muted-foreground">☀️ 날씨 정보를 불러오는 중입니다.</p>;
  }

  if (state.status === "error") {
    return <p className="truncate text-xs text-muted-foreground">☁️ 날씨 정보를 가져올 수 없습니다.</p>;
  }

  return (
    <p className="truncate text-xs text-muted-foreground">
      {state.data.icon} {state.data.temperature}℃ · {state.data.comment}
    </p>
  );
}
