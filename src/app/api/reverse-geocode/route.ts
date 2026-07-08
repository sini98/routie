import { NextRequest, NextResponse } from "next/server";

// 이 라우트는 서버에서만 실행됩니다. 좌표 → 주소/건물명 변환(Reverse Geocoding)은
// app/api/geocode(주소 → 좌표)와 반대 방향이지만, 같은 NCP Maps 상품이라 같은 자격 증명
// (NAVER_MAP_CLIENT_ID/NAVER_MAP_CLIENT_SECRET, NEXT_PUBLIC_ 접두사 없음)을 그대로 씁니다.
// 위치를 지도에서 직접 찍었을 때 "장소명" 입력칸에 채워 넣을 이름을 추측하는 용도입니다.
const REVERSE_GEOCODE_ENDPOINT = "https://maps.apigw.ntruss.com/map-reversegeocoding/v2/gc";

function mask(value: string | undefined) {
  if (!value) return "(미설정)";
  return value.length <= 4 ? "****" : `${value.slice(0, 4)}****(len=${value.length})`;
}

type NaverReverseGeocodeArea = { name?: string };
type NaverReverseGeocodeRegion = {
  area1?: NaverReverseGeocodeArea;
  area2?: NaverReverseGeocodeArea;
  area3?: NaverReverseGeocodeArea;
};
type NaverReverseGeocodeAddition = { type?: string; value?: string };
type NaverReverseGeocodeLand = {
  name?: string;
  number1?: string;
  number2?: string;
  addition0?: NaverReverseGeocodeAddition;
};
type NaverReverseGeocodeResult = {
  name?: string; // "roadaddr" | "addr" 등
  region?: NaverReverseGeocodeRegion;
  land?: NaverReverseGeocodeLand;
};

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "좌표가 필요합니다.", reason: "MISSING_QUERY" }, { status: 400 });
  }

  const clientId = process.env.NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

  console.log("[Routie][reverse-geocode] 환경변수 확인", {
    NAVER_MAP_CLIENT_ID: mask(clientId),
    NAVER_MAP_CLIENT_SECRET: mask(clientSecret),
  });

  if (!clientId || !clientSecret) {
    console.error("[Routie][reverse-geocode] NAVER_MAP_CLIENT_ID/NAVER_MAP_CLIENT_SECRET이 설정되지 않았습니다.");
    return NextResponse.json(
      { error: "네이버 지도 API 키가 설정되지 않았어요.", reason: "MISSING_CONFIG" },
      { status: 503 }
    );
  }

  // 이 API는 "경도,위도" 순서입니다(geocode 응답의 x=경도/y=위도와 같은 순서).
  const requestUrl = `${REVERSE_GEOCODE_ENDPOINT}?coords=${lng},${lat}&output=json&orders=roadaddr,addr`;
  console.log("[Routie][reverse-geocode] 요청 URL", requestUrl);

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      headers: {
        "X-NCP-APIGW-API-KEY-ID": clientId,
        "X-NCP-APIGW-API-KEY": clientSecret,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (error) {
    console.error("[Routie][reverse-geocode] fetch 자체가 실패했습니다 (네트워크 오류)", error);
    return NextResponse.json({ error: "이름을 불러오지 못했어요.", reason: "NETWORK_ERROR" }, { status: 500 });
  }

  const rawBody = await response.text();
  console.log("[Routie][reverse-geocode] 네이버 API 응답", {
    status: response.status,
    ok: response.ok,
    body: rawBody.slice(0, 1000),
  });

  if (!response.ok) {
    const reason = response.status === 401 || response.status === 403 ? "AUTH_FAILED" : "UPSTREAM_ERROR";
    console.error(
      `[Routie][reverse-geocode] 네이버 API 호출 실패 (status=${response.status}, reason=${reason})`,
      rawBody
    );
    return NextResponse.json(
      {
        error:
          reason === "AUTH_FAILED"
            ? "네이버 API 인증에 실패했어요. Client ID/Secret 또는 Reverse Geocoding 활성화 여부를 확인해주세요."
            : "이름을 불러오지 못했어요.",
        reason,
        upstreamStatus: response.status,
      },
      { status: 502 }
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(rawBody);
  } catch (error) {
    console.error("[Routie][reverse-geocode] 네이버 API 응답이 JSON이 아닙니다", error, rawBody);
    return NextResponse.json({ error: "이름을 불러오지 못했어요.", reason: "INVALID_RESPONSE" }, { status: 502 });
  }

  const results = (data as { results?: NaverReverseGeocodeResult[] })?.results ?? [];
  const roadaddr = results.find((result) => result.name === "roadaddr");
  const addr = results.find((result) => result.name === "addr");

  // 우선순위: 1) 건물명(POI명) → 2) "도로명 주소 근처" → 3) "행정동 선택 위치" → 4) "선택한 위치".
  // 건물명은 roadaddr 결과의 land.addition0이 "building" 타입일 때만 의미 있는 이름입니다.
  const buildingName =
    roadaddr?.land?.addition0?.type === "building" ? roadaddr.land.addition0.value?.trim() || undefined : undefined;

  const roadAddressLabel = roadaddr?.land?.name
    ? [roadaddr.land.name, roadaddr.land.number1, roadaddr.land.number2 && `-${roadaddr.land.number2}`]
        .filter(Boolean)
        .join(" ")
        .replace(/ -/g, "-")
    : undefined;

  const dongName = roadaddr?.region?.area3?.name || addr?.region?.area3?.name || undefined;

  let suggestedName: string;
  let reason: "building" | "roadAddress" | "dong" | "none";

  if (buildingName) {
    suggestedName = buildingName;
    reason = "building";
  } else if (roadAddressLabel) {
    suggestedName = `${roadAddressLabel} 근처`;
    reason = "roadAddress";
  } else if (dongName) {
    suggestedName = `${dongName} 선택 위치`;
    reason = "dong";
  } else {
    suggestedName = "선택한 위치";
    reason = "none";
  }

  console.log("[Routie][reverse-geocode] 이름 추천 결과", {
    buildingName,
    roadAddressLabel,
    dongName,
    suggestedName,
    reason,
  });

  return NextResponse.json({ suggestedName, reason, buildingName, roadAddress: roadAddressLabel, dong: dongName });
}
