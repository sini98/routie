"use client";

import { useEffect, useState } from "react";

export type AutoLocateStatus = "idle" | "checking" | "located" | "needs-permission" | "unavailable";

type Coords = { lat: number; lng: number };

// 1차: 가능한 한 정확한 측위(GPS 우선)를 시도합니다. 데스크톱/노트북처럼 GPS 칩이 없는
// 기기에서는 enableHighAccuracy가 오히려 응답을 오래 걸리게 하거나 타임아웃/실패로 이어질
// 수 있어서, 1차가 실패(권한 거부 제외)하면 2차로 표준 정확도(Wi-Fi/IP 기반)로 한 번 더
// 시도합니다. maximumAge: 0으로 둘 다 브라우저가 예전에 캐시해둔(다른 장소에 있었을 때의)
// 위치를 재사용하지 않도록 강제합니다.
const HIGH_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8_000,
  maximumAge: 0,
};
const STANDARD_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8_000,
  maximumAge: 0,
};

function toCoords(position: GeolocationPosition): Coords {
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}

/**
 * getCurrentPosition을 enableHighAccuracy: true로 먼저 시도하고, 실패하면(권한 거부는
 * 제외 — 재시도해도 의미가 없으므로 바로 실패 처리) enableHighAccuracy: false로 한 번 더
 * 시도합니다. isCancelled()가 true를 반환하면 그 시점 이후의 콜백은 무시합니다.
 */
function fetchPositionWithFallback(
  onSuccess: (coords: Coords, accuracy: number, attempt: "high" | "standard") => void,
  onError: (error: GeolocationPositionError) => void,
  isCancelled: () => boolean
) {
  console.log("[Routie][Debug][useAutoLocate] 1차 시도(enableHighAccuracy=true) getCurrentPosition 호출", HIGH_ACCURACY_OPTIONS);
  navigator.geolocation.getCurrentPosition(
    (position) => {
      if (isCancelled()) return;
      const coords = toCoords(position);
      console.log("[Routie][Debug][useAutoLocate] 1차 시도 성공 → currentLocation", {
        coords,
        accuracy: position.coords.accuracy,
      });
      onSuccess(coords, position.coords.accuracy, "high");
    },
    (error) => {
      if (isCancelled()) return;
      console.log("[Routie][Debug][useAutoLocate] 1차 시도 실패", { code: error.code, message: error.message });

      if (error.code === error.PERMISSION_DENIED) {
        onError(error);
        return;
      }

      console.log(
        "[Routie][Debug][useAutoLocate] 2차 시도(enableHighAccuracy=false) getCurrentPosition 호출",
        STANDARD_ACCURACY_OPTIONS
      );
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (isCancelled()) return;
          const coords = toCoords(position);
          console.log("[Routie][Debug][useAutoLocate] 2차 시도 성공 → currentLocation", {
            coords,
            accuracy: position.coords.accuracy,
          });
          onSuccess(coords, position.coords.accuracy, "standard");
        },
        (secondError) => {
          if (isCancelled()) return;
          console.log("[Routie][Debug][useAutoLocate] 2차 시도도 실패 → defaultLocation(서울)로 대체", {
            code: secondError.code,
            message: secondError.message,
          });
          onError(secondError);
        },
        STANDARD_ACCURACY_OPTIONS
      );
    },
    HIGH_ACCURACY_OPTIONS
  );
}

/**
 * "오늘 외출"에 아직 장소가 하나도 없을 때(enabled=true), 이미 위치 권한이 허용되어 있다면
 * 조용히 현재 위치를 가져와 `currentLocation`으로 반환합니다. 장소가 하나라도 있으면
 * 호출하는 쪽에서 enabled=false를 넘겨 절대 건드리지 않아야 합니다.
 *
 * 중요: 이 훅은 routie:defaultRegion(기본 지역)을 읽거나 쓰지 않습니다. currentLocation은
 * 이 훅 내부의 컴포넌트 state로만 들고 있고(=persist하지 않고 방문할 때마다 새로 조회),
 * 화면 쪽(OutingScreen)에서 "오늘 + 장소 0개"일 때만 defaultRegion보다 우선해서 씁니다
 * (NaverMap.tsx의 currentLocationOnly prop 참고).
 *
 * 권한이 아직 결정되지 않은 상태(prompt)라면 여기서 자동으로 브라우저 팝업을 띄우지 않고
 * status를 "needs-permission"으로만 알려줍니다 — 화면에 안내 버튼을 두고, 사용자가 그
 * 버튼을 눌렀을 때(진짜 클릭 제스처)만 requestNow()로 실제 권한 팝업을 띄우기 위해서입니다.
 *
 * 현재 위치는 어디까지나 "시작점" 힌트일 뿐입니다 — 최종 좌표는 항상 사용자가 지도에서
 * 직접 확정한 값을 씁니다(이 훅은 그 확정에 관여하지 않습니다).
 */
export function useAutoLocate(enabled: boolean) {
  const [currentLocation, setCurrentLocation] = useState<Coords | null>(null);
  // enabled가 처음부터 true라면 상태를 "idle"이 아니라 "checking"으로 시작합니다. 그렇지
  // 않으면 아래 effect가 실제로 permissions.query를 완료하기 전까지의 아주 짧은 첫 렌더
  // 동안 status가 "idle"(= "확인할 것 없음")로 보여서, 호출하는 쪽이 그 틈에 지도를 엉뚱한
  // 값으로 그려버리는 "깜빡임" 문제가 있었습니다.
  const [status, setStatus] = useState<AutoLocateStatus>(enabled ? "checking" : "idle");

  useEffect(() => {
    console.log("[Routie][Debug][useAutoLocate] effect 실행", { enabled });
    if (!enabled) return;

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      console.log("[Routie][Debug][useAutoLocate] geolocation API 자체를 지원하지 않음 → unavailable(defaultLocation)");
      setStatus("unavailable");
      return;
    }

    let cancelled = false;
    setStatus("checking");

    const fetchCurrentPosition = () => {
      fetchPositionWithFallback(
        (coords) => {
          setCurrentLocation(coords);
          setStatus("located");
        },
        () => {
          setStatus("unavailable");
        },
        () => cancelled
      );
    };

    if (typeof navigator.permissions?.query === "function") {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((permissionStatus) => {
          console.log("[Routie][Debug][useAutoLocate] permissions.query 결과", permissionStatus.state);
          if (cancelled) return;
          if (permissionStatus.state === "granted") {
            fetchCurrentPosition();
          } else if (permissionStatus.state === "prompt") {
            setStatus("needs-permission");
          } else {
            setStatus("unavailable");
          }
        })
        .catch((error) => {
          console.log("[Routie][Debug][useAutoLocate] permissions.query 자체가 실패함(브라우저가 미지원일 수 있음)", error);
          if (!cancelled) setStatus("unavailable");
        });
    } else {
      // Permissions API 미지원 브라우저는 상태를 미리 알 수 없습니다. 여기서 새로 권한을
      // 요청해 예상치 못한 팝업을 띄우는 대신, "unavailable"로 두어 서울 기본값을 씁니다.
      console.log("[Routie][Debug][useAutoLocate] navigator.permissions.query 미지원 → unavailable(자동 조회 안 함)");
      setStatus("unavailable");
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  /** 안내 버튼 클릭처럼 실제 사용자 제스처가 있을 때 호출하세요 — 필요하면 브라우저 권한 팝업이 뜹니다. */
  const requestNow = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("checking");
    fetchPositionWithFallback(
      (coords) => {
        setCurrentLocation(coords);
        setStatus("located");
      },
      () => {
        setStatus("unavailable");
      },
      () => false
    );
  };

  return { status, currentLocation, requestNow };
}
