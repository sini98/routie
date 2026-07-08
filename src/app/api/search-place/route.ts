import { NextRequest, NextResponse } from "next/server";

// 이 라우트는 서버에서만 실행됩니다. 카페/음식점/역/상호명 같은 장소(POI) 검색은
// app/api/geocode(NCP Maps Geocoding — 지역명/주소 전용)로는 안 되고, 완전히 별개의
// 네이버 오픈 API(개발자센터, developers.naver.com) "검색 > 지역" API가 필요합니다.
//
// 주의: 이 API의 Client ID/Secret은 NAVER_MAP_CLIENT_ID/NAVER_MAP_CLIENT_SECRET(NCP
// 콘솔, Maps용)과 완전히 다른 시스템의 자격 증명입니다. 반드시 developers.naver.com에서
// "검색" API가 활성화된 Application을 따로 등록해서 NAVER_SEARCH_CLIENT_ID/
// NAVER_SEARCH_CLIENT_SECRET에 넣어야 합니다(둘 다 서버 전용, NEXT_PUBLIC_ 접두사 없음).
//
// 좌표는 이 API가 주는 mapx/mapy를 쓰지 않습니다. 이 값의 좌표계(단순 WGS84*10^7인지,
// KATEC 계열인지)가 계정/버전에 따라 다르게 동작한다는 보고가 있어 신뢰할 수 없었고,
// 실제로 "카페", "스타벅스" 검색 결과가 지도에 정확히 반영되지 않는 문제가 있었습니다.
// 대신 이 라우트는 장소명/주소 "찾기"에만 쓰고, 최종 좌표는 항상 이미 검증된
// app/api/geocode(Geocoding)로 그 주소를 다시 변환해서 얻습니다(클라이언트에서 처리).
const LOCAL_SEARCH_ENDPOINT = "https://openapi.naver.com/v1/search/local.json";

function mask(value: string | undefined) {
  if (!value) return "(미설정)";
  return value.length <= 4 ? "****" : `${value.slice(0, 4)}****(len=${value.length})`;
}

// 검색어와 일치하는 부분을 <b> 태그로 감싸서 내려주므로 화면에 그대로 보여주기 전에 제거합니다.
function stripHtmlTags(value: string) {
  return value.replace(/<[^>]*>/g, "");
}

type NaverLocalItem = {
  title: string;
  category?: string;
  address?: string;
  roadAddress?: string;
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ error: "검색어가 필요합니다.", reason: "MISSING_QUERY" }, { status: 400 });
  }

  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  console.log("[Routie][search-place] 환경변수 확인", {
    NAVER_SEARCH_CLIENT_ID: mask(clientId),
    NAVER_SEARCH_CLIENT_SECRET: mask(clientSecret),
  });

  if (!clientId || !clientSecret) {
    console.error("[Routie][search-place] NAVER_SEARCH_CLIENT_ID/NAVER_SEARCH_CLIENT_SECRET이 설정되지 않았습니다.");
    return NextResponse.json(
      { error: "장소 검색 API 키가 설정되지 않아 검색을 사용할 수 없습니다.", reason: "MISSING_CONFIG" },
      { status: 503 }
    );
  }

  const requestUrl = `${LOCAL_SEARCH_ENDPOINT}?query=${encodeURIComponent(query)}&display=5&sort=random`;
  console.log("[Routie][search-place] 요청 URL", requestUrl);

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (error) {
    console.error("[Routie][search-place] fetch 자체가 실패했습니다 (네트워크 오류)", error);
    return NextResponse.json({ error: "검색 중 문제가 발생했어요.", reason: "NETWORK_ERROR" }, { status: 500 });
  }

  const rawBody = await response.text();
  console.log("[Routie][search-place] 네이버 API 응답", {
    status: response.status,
    ok: response.ok,
    body: rawBody.slice(0, 1000),
  });

  if (!response.ok) {
    // 401 = 인증 실패(Client ID/Secret이 틀렸거나, NCP Maps용 키를 잘못 넣은 경우가 대부분입니다).
    const reason = response.status === 401 ? "AUTH_FAILED" : "UPSTREAM_ERROR";
    console.error(
      `[Routie][search-place] 네이버 API 호출 실패 (status=${response.status}, reason=${reason})`,
      rawBody
    );
    return NextResponse.json(
      {
        error:
          reason === "AUTH_FAILED"
            ? "네이버 검색 API 인증에 실패했어요. NAVER_SEARCH_CLIENT_ID/SECRET이 맞는지 확인해주세요(Maps용 키와 다릅니다)."
            : "장소 검색 요청이 실패했습니다.",
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
    console.error("[Routie][search-place] 네이버 API 응답이 JSON이 아닙니다", error, rawBody);
    return NextResponse.json({ error: "검색 중 문제가 발생했어요.", reason: "INVALID_RESPONSE" }, { status: 502 });
  }

  const items = (data as { items?: NaverLocalItem[] })?.items ?? [];

  const places = items
    .map((item) => {
      const address = stripHtmlTags(item.roadAddress || item.address || "");
      // 주소가 없으면 뒤에서 Geocoding으로 좌표를 얻을 방법이 없으니 제외합니다.
      if (!address) return null;

      return {
        name: stripHtmlTags(item.title ?? ""),
        category: item.category ? stripHtmlTags(item.category) : undefined,
        address,
      };
    })
    .filter((place): place is NonNullable<typeof place> => place !== null);

  return NextResponse.json({ places });
}
