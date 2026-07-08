import { NextRequest, NextResponse } from "next/server";

// 이 라우트는 서버에서만 실행됩니다. NAVER_MAP_CLIENT_ID/NAVER_MAP_CLIENT_SECRET은
// NEXT_PUBLIC_ 접두사가 없어 브라우저 번들에 절대 포함되지 않으므로 여기서만 안전하게 사용합니다.
// (지도 JS SDK가 쓰는 공개용 NEXT_PUBLIC_NAVER_MAP_CLIENT_ID와는 별개의, Geocoding 전용 자격 증명입니다.)
const GEOCODE_ENDPOINT = "https://maps.apigw.ntruss.com/map-geocode/v2/geocode";

// 콘솔에 시크릿을 그대로 남기지 않도록 앞 4자리만 노출합니다.
function mask(value: string | undefined) {
  if (!value) return "(미설정)";
  return value.length <= 4 ? "****" : `${value.slice(0, 4)}****(len=${value.length})`;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ error: "검색어가 필요합니다.", reason: "MISSING_QUERY" }, { status: 400 });
  }

  const clientId = process.env.NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

  console.log("[Routie][geocode] 환경변수 확인", {
    NAVER_MAP_CLIENT_ID: mask(clientId),
    NAVER_MAP_CLIENT_SECRET: mask(clientSecret),
  });

  if (!clientId || !clientSecret) {
    console.error("[Routie][geocode] NAVER_MAP_CLIENT_ID/NAVER_MAP_CLIENT_SECRET이 설정되지 않았습니다.");
    return NextResponse.json(
      { error: "네이버 지도 API 키가 설정되지 않아 검색을 사용할 수 없습니다.", reason: "MISSING_CONFIG" },
      { status: 503 }
    );
  }

  const requestUrl = `${GEOCODE_ENDPOINT}?query=${encodeURIComponent(query)}`;
  console.log("[Routie][geocode] 요청 URL", requestUrl);

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
    console.error("[Routie][geocode] fetch 자체가 실패했습니다 (네트워크 오류)", error);
    return NextResponse.json({ error: "검색 중 문제가 발생했어요.", reason: "NETWORK_ERROR" }, { status: 500 });
  }

  // 응답 body는 한 번만 읽을 수 있으므로 먼저 텍스트로 읽고, 필요하면 JSON으로 파싱합니다.
  const rawBody = await response.text();
  console.log("[Routie][geocode] 네이버 API 응답", {
    status: response.status,
    ok: response.ok,
    body: rawBody.slice(0, 1000),
  });

  if (!response.ok) {
    // 401/403 = 인증 실패(Client ID/Secret이 틀렸거나, 해당 Application에 Geocoding이
    // 활성화되어 있지 않은 경우가 대부분입니다). 나머지는 그 외 업스트림 오류입니다.
    const reason = response.status === 401 || response.status === 403 ? "AUTH_FAILED" : "UPSTREAM_ERROR";
    console.error(
      `[Routie][geocode] 네이버 API 호출 실패 (status=${response.status}, reason=${reason})`,
      rawBody
    );
    return NextResponse.json(
      {
        error:
          reason === "AUTH_FAILED"
            ? "네이버 API 인증에 실패했어요. Client ID/Secret 또는 Geocoding 활성화 여부를 확인해주세요."
            : "검색 요청이 실패했습니다.",
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
    console.error("[Routie][geocode] 네이버 API 응답이 JSON이 아닙니다", error, rawBody);
    return NextResponse.json({ error: "검색 중 문제가 발생했어요.", reason: "INVALID_RESPONSE" }, { status: 502 });
  }

  const first = (data as { addresses?: Array<{ x: string; y: string; roadAddress?: string; jibunAddress?: string }> })
    ?.addresses?.[0];

  if (!first) {
    console.log("[Routie][geocode] 검색은 성공했지만 결과가 0건입니다.", { query, data });
    return NextResponse.json({ error: "검색 결과를 찾을 수 없어요.", reason: "NO_RESULTS" }, { status: 404 });
  }

  // 네이버 Geocoding 응답은 x=경도, y=위도 입니다.
  const lat = Number(first.y);
  const lng = Number(first.x);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    console.error("[Routie][geocode] 좌표 파싱 실패", first);
    return NextResponse.json({ error: "검색 결과 좌표를 읽을 수 없어요.", reason: "INVALID_RESPONSE" }, { status: 502 });
  }

  return NextResponse.json({
    lat,
    lng,
    address: first.roadAddress || first.jibunAddress || query,
  });
}
