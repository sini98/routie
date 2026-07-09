import { NextRequest, NextResponse } from "next/server";
import { latLngToKmaGrid, parseKmaGridCell } from "@/lib/kmaGrid";
import { describeWeather } from "@/lib/weatherPresentation";

// 기상청 API허브(apihub.kma.go.kr)에서 활용신청 승인된 API 경로입니다 — "예특보 > 단기예보 >
// 동네예보"의 nph-dfs_vsrt_grd(초단기예보 격자)이며, VilageFcstInfoService_2.0(JSON REST)과는
// 전혀 다른 legacy 텍스트 API입니다. 한 번 호출하면 그 시각의 "변수 하나"에 대한 전국
// 149×253 격자 값을 통째로(줄바꿈된 숫자 텍스트로) 돌려주고, 우리가 필요한 변수(T1H/SKY/
// PTY/RN1)마다 별도로 호출해야 합니다 — vars에 쉼표로 여러 개를 넣어도 지원되지 않습니다
// (실제로 호출해서 확인함: 첫 번째 변수만 반영되는 게 아니라 대부분 -99로 깨집니다).
const KMA_ULTRA_ENDPOINT = "https://apihub.kma.go.kr/api/typ01/cgi-bin/url/nph-dfs_vsrt_grd";

// 단기예보(동네예보, 최대 3일 뒤까지) 격자 endpoint입니다. 초단기예보(nph-dfs_vsrt_grd)와
// 같은 "예특보 > 단기예보 > 동네예보" 계열의 legacy 텍스트 API로, 이름 규칙만 vsrt->shrt로
// 바뀝니다. ✅ 실제 승인된 authKey로 호출해 검증됨: endpoint 이름, tmfc+tmef+vars+authKey
// 파라미터 조합, 변수 코드(TMP/SKY/PTY/PCP), 격자 응답 포맷(vsrt와 동일한 전국 149×253
// 텍스트 격자) 모두 실제 응답으로 확인했습니다. ⚠️ 다만 tmfc의 "발표 후 10분" 지연 가정과
// "3일" 최대 조회 범위(SHRT_MAX_DAYS_AHEAD)는 공식 문서로 재확인하지 못했습니다 — 발표
// 직후나 D+3 경계에서 실패하면 이 두 값부터 의심하세요.
const KMA_SHRT_ENDPOINT = "https://apihub.kma.go.kr/api/typ01/cgi-bin/url/nph-dfs_shrt_grd";

// 단기예보는 하루 8번(02,05,08,11,14,17,20,23시) 발표됩니다. 발표 후 조회 가능해지기까지의
// 정확한 지연 시간은 검증하지 못해, 초단기예보(30분 생성/45분 조회)와 비슷하게 여유를 두고
// "발표 시각 + 10분"이 지나야 그 발표를 쓰도록 보수적으로 잡았습니다.
const SHRT_ISSUE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];
// 단기예보는 발표 시점부터 최대 이 일수 뒤까지만 예보를 제공합니다(기상청 공식 최대 범위).
const SHRT_MAX_DAYS_AHEAD = 3;

const LOG_PREFIX = "[Routie][weather]";

function mask(value: string | undefined) {
  if (!value) return "(미설정)";
  return value.length <= 4 ? "****" : `${value.slice(0, 4)}****(len=${value.length})`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** 지금 시각을 KST(UTC+9) Date로 변환합니다. 서버가 어떤 타임존에서 돌든(Vercel은 UTC)
 * 항상 같은 결과를 내기 위해 로컬 타임존 오프셋을 걷어낸 뒤 KST 오프셋을 다시 더합니다. */
function toKst(now: Date): Date {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMs + 9 * 60 * 60_000);
}

// 초단기예보는 매시 30분에 생성되어 45분부터 조회할 수 있습니다. 현재 시각이 이번 시간
// 발표(45분)보다 이르면 한 시간 전 tmfc(직전 발표)를 씁니다.
function getTmfc(now: Date): string {
  const kst = toKst(now);

  if (kst.getMinutes() < 45) {
    kst.setHours(kst.getHours() - 1);
  }

  const dateStr = `${kst.getFullYear()}${pad(kst.getMonth() + 1)}${pad(kst.getDate())}`;
  return `${dateStr}${pad(kst.getHours())}30`;
}

/** 단기예보의 오늘 발표 시각들(02/05/08/11/14/17/20/23시) 중, "발표 후 10분이 지난" 가장
 * 최근 발표를 tmfc로 씁니다. 자정~02:10 사이라 오늘 발표가 아직 하나도 없으면 전날 23시
 * 발표를 씁니다. */
function getShrtTmfc(now: Date): string {
  const kst = toKst(now);

  for (const hour of [...SHRT_ISSUE_HOURS].reverse()) {
    const issuedAt = new Date(kst.getFullYear(), kst.getMonth(), kst.getDate(), hour, 10);
    if (kst >= issuedAt) {
      return `${kst.getFullYear()}${pad(kst.getMonth() + 1)}${pad(kst.getDate())}${pad(hour)}00`;
    }
  }

  const yesterday = new Date(kst);
  yesterday.setDate(yesterday.getDate() - 1);
  return `${yesterday.getFullYear()}${pad(yesterday.getMonth() + 1)}${pad(yesterday.getDate())}2300`;
}

/** "YYYY-MM-DD" -> 그 날짜 정오(1200)를 가리키는 예보시각(tmef) 문자열. 하루 종일의 외출을
 * 대표할 만한 값으로 정오를 골랐습니다(오전/오후 특정 시간을 고를 근거가 이 앱엔 없습니다). */
function toTmef(dateKey: string): string {
  return `${dateKey.replaceAll("-", "")}1200`;
}

/** tmfc(발표 시각 문자열 YYYYMMDDHHmm)가 가리키는 날짜와, 요청받은 목표 날짜 사이의 일수 차이. */
function daysBetween(tmfc: string, dateKey: string): number {
  const issuedDate = new Date(Number(tmfc.slice(0, 4)), Number(tmfc.slice(4, 6)) - 1, Number(tmfc.slice(6, 8)));
  const [year, month, day] = dateKey.split("-").map(Number);
  const targetDate = new Date(year, month - 1, day);
  return Math.round((targetDate.getTime() - issuedDate.getTime()) / (24 * 60 * 60_000));
}

type VariableResult = { variable: string; value: number } | { variable: string; error: string };

/** 변수 하나에 대한 전국 격자를 받아 (nx, ny) 한 칸만 뽑아냅니다. endpoint/추가 파라미터(예:
 * 단기예보의 tmef)를 받아 초단기예보/단기예보 양쪽에서 재사용합니다. */
async function fetchGridVariable(
  endpoint: string,
  variable: string,
  baseParams: Record<string, string>,
  nx: number,
  ny: number,
  authKey: string,
  logStep: string
): Promise<VariableResult> {
  const query = new URLSearchParams({ ...baseParams, vars: variable, authKey });
  const requestUrl = `${endpoint}?${query.toString()}`;
  console.log(
    `${LOG_PREFIX} [${logStep}] 기상청 API허브 요청 (${variable})`,
    requestUrl.replace(encodeURIComponent(authKey), mask(authKey))
  );

  let response: Response;
  try {
    response = await fetch(requestUrl, { cache: "no-store" });
  } catch (error) {
    console.error(`${LOG_PREFIX} [${logStep}] (${variable}) 실패 — fetch 자체가 실패했습니다 (네트워크 오류)`, error);
    return { variable, error: "NETWORK_ERROR" };
  }

  const rawBody = await response.text();
  console.log(`${LOG_PREFIX} [${logStep}] (${variable}) 응답`, {
    status: response.status,
    ok: response.ok,
    bodyPreview: rawBody.slice(0, 120),
  });

  if (!response.ok) {
    console.error(`${LOG_PREFIX} [${logStep}] (${variable}) 실패 — HTTP status=${response.status}`, {
      body: rawBody.slice(0, 500),
    });
    return { variable, error: `UPSTREAM_ERROR(${response.status})` };
  }

  const parsed = parseKmaGridCell(rawBody, nx, ny);
  if ("error" in parsed) {
    console.error(`${LOG_PREFIX} [${logStep}] (${variable}) 격자 파싱 실패`, parsed.error);
    return { variable, error: parsed.error };
  }

  console.log(`${LOG_PREFIX} [${logStep}] (${variable}) 격자 파싱 성공 (nx=${nx}, ny=${ny})`, parsed.value);
  return { variable, value: parsed.value };
}

/** 변수별 결과 목록에서 "기온" 하나를 필수로 뽑고, SKY/PTY/강수량(비상관 변수명)은 있으면
 * 쓰고 없으면 빈 값으로 취급하는 공통 로직입니다. 초단기예보(T1H/RN1)와 단기예보(TMP/PCP)가
 * 변수 이름만 다르고 나머지 취급 방식은 동일해서 공유합니다. */
function buildWeatherResponse(
  results: VariableResult[],
  tempVariable: string,
  precipVariable: string,
  nx: number,
  ny: number,
  logStep: string
): { ok: true; body: { temperature: number; icon: string; comment: string } } | { ok: false; response: NextResponse } {
  const byVariable = new Map(results.map((r) => [r.variable, r]));
  const tempResult = byVariable.get(tempVariable);

  if (!tempResult || "error" in tempResult) {
    console.error(`${LOG_PREFIX} [${logStep}] 실패 — 기온(${tempVariable})을 가져오지 못했습니다.`, tempResult);
    return {
      ok: false,
      response: NextResponse.json({ error: "날씨 정보를 가져올 수 없습니다.", reason: "INVALID_RESPONSE" }, { status: 502 }),
    };
  }

  if (tempResult.value === -99) {
    console.error(`${LOG_PREFIX} [${logStep}] 실패 — 이 위치(nx=${nx}, ny=${ny})는 기온 데이터가 없습니다(-99).`);
    return {
      ok: false,
      response: NextResponse.json({ error: "날씨 정보를 가져올 수 없습니다.", reason: "NO_RESULTS" }, { status: 502 }),
    };
  }

  const temperature = Math.round(tempResult.value);

  const readCode = (variable: string): string => {
    const result = byVariable.get(variable);
    if (!result || "error" in result || result.value === -99) return "";
    return String(Math.round(result.value));
  };
  const sky = readCode("SKY");
  const pty = readCode("PTY") || "0";

  const precipResult = byVariable.get(precipVariable);
  const precip = precipResult && !("error" in precipResult) ? precipResult.value : undefined;

  const { icon, comment } = describeWeather(sky, pty, precip);
  return { ok: true, body: { temperature, icon, comment } };
}

export async function GET(request: NextRequest) {
  const latParam = request.nextUrl.searchParams.get("lat");
  const lngParam = request.nextUrl.searchParams.get("lng");
  // source는 이 요청이 어디서 왔는지(GPS/서울 fallback/수동 테스트) 로그에서 바로 구분하기
  // 위한 것뿐이라, 없어도 동작에는 영향이 없습니다.
  const source = request.nextUrl.searchParams.get("source") ?? "unknown";
  // date가 있으면(지정 외출의 특정 날짜) 단기예보를, 없으면(오늘 외출) 기존처럼
  // 초단기예보를 씁니다.
  const dateParam = request.nextUrl.searchParams.get("date");
  const lat = Number(latParam);
  const lng = Number(lngParam);

  if (!latParam || !lngParam || Number.isNaN(lat) || Number.isNaN(lng)) {
    console.error(`${LOG_PREFIX} [요청 검증] lat/lng 누락 또는 잘못된 값`, { latParam, lngParam, source });
    return NextResponse.json({ error: "위치 정보가 필요합니다.", reason: "MISSING_LOCATION" }, { status: 400 });
  }

  // ── STEP 1: KMA_API_KEY(API허브 authKey) 로딩 여부 ─────────────────────
  const authKey = process.env.KMA_API_KEY;
  const hasKey = Boolean(authKey);
  console.log(`${LOG_PREFIX} [STEP 1/5] KMA_API_KEY(authKey) 로딩 여부`, { loaded: hasKey, masked: mask(authKey) });

  if (!authKey) {
    console.error(`${LOG_PREFIX} [STEP 1/5] 실패 — KMA_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요.`);
    return NextResponse.json(
      { error: "날씨 API 키가 설정되지 않았습니다.", reason: "MISSING_CONFIG" },
      { status: 503 }
    );
  }

  // ── STEP 2: 좌표 → 기상청 격자(nx, ny) 변환 ────────────────────────────
  const { nx, ny } = latLngToKmaGrid(lat, lng);

  if (dateParam) {
    return handleShortTermForecast({ dateParam, nx, ny, lat, lng, authKey, source });
  }

  const tmfc = getTmfc(new Date());
  console.log(`${LOG_PREFIX} [STEP 2/5] 좌표 변환 — 초단기예보 (source=${source})`, { lat, lng, nx, ny, tmfc });

  // ── STEP 3~4: 기상청 API허브 호출(변수별 병렬) + 격자 파싱 ────────────────
  // vars에 쉼표로 여러 변수를 한 번에 못 넣으므로(실측 확인됨), T1H/SKY/PTY/RN1을 각각
  // 별도 요청으로 병렬 호출합니다. 순차로 하면 4번 다 느린(수십 초) legacy 엔드포인트라
  // 총 대기시간이 배로 늘어나므로, Promise.all로 동시에 보내 가장 느린 한 번만큼만 기다립니다.
  const results = await Promise.all(
    ["T1H", "SKY", "PTY", "RN1"].map((variable) =>
      fetchGridVariable(KMA_ULTRA_ENDPOINT, variable, { tmfc }, nx, ny, authKey, "STEP 3/5")
    )
  );

  const built = buildWeatherResponse(results, "T1H", "RN1", nx, ny, "STEP 4/5");
  if (!built.ok) return built.response;

  // ── STEP 5: 최종 날씨 데이터 반환 ──────────────────────────────────────
  console.log(`${LOG_PREFIX} [STEP 5/5] 성공(초단기예보) — 최종 날씨 데이터`, { ...built.body, source });
  return NextResponse.json(built.body);
}

type ShortTermParams = {
  dateParam: string;
  nx: number;
  ny: number;
  lat: number;
  lng: number;
  authKey: string;
  source: string;
};

/** 지정 외출(특정 날짜)용 단기예보 흐름입니다. 초단기예보와 별개 경로라, 여기서 실패해도
 * 오늘 외출의 초단기예보 흐름에는 전혀 영향을 주지 않습니다. */
async function handleShortTermForecast({ dateParam, nx, ny, lat, lng, authKey, source }: ShortTermParams) {
  const tmfc = getShrtTmfc(new Date());
  const tmef = toTmef(dateParam);
  const dayDiff = daysBetween(tmfc, dateParam);
  console.log(`${LOG_PREFIX} [STEP 2/5] 좌표 변환 — 단기예보 (source=${source})`, {
    lat,
    lng,
    nx,
    ny,
    tmfc,
    tmef,
    dayDiff,
  });

  // 단기예보는 발표 시점부터 최대 SHRT_MAX_DAYS_AHEAD일 뒤까지만 제공됩니다. 이미 지난
  // 날짜(dayDiff < 0)이거나 범위를 벗어난 미래 날짜면, 굳이 API를 호출하지 않고 바로
  // "데이터 없음"으로 응답합니다(불필요한 API 호출/쿼터 소모를 막기 위함).
  if (dayDiff < 0 || dayDiff > SHRT_MAX_DAYS_AHEAD) {
    console.warn(`${LOG_PREFIX} [STEP 2/5] 단기예보 제공 범위 밖 — 호출을 건너뜁니다.`, { dayDiff, dateParam });
    return NextResponse.json(
      { error: "이 날짜의 예보 정보는 제공되지 않아요.", reason: "OUT_OF_FORECAST_RANGE" },
      { status: 502 }
    );
  }

  // 변수 이름(TMP/SKY/PTY/PCP)과 tmef 파라미터는 실제 승인된 authKey로 호출해 검증됐습니다
  // (KMA_SHRT_ENDPOINT 주석 참고). 여기서 실패해도 초단기예보(오늘 외출) 흐름에는 영향이 없습니다.
  const results = await Promise.all(
    ["TMP", "SKY", "PTY", "PCP"].map((variable) =>
      fetchGridVariable(KMA_SHRT_ENDPOINT, variable, { tmfc, tmef }, nx, ny, authKey, "STEP 3/5(단기)")
    )
  );

  const built = buildWeatherResponse(results, "TMP", "PCP", nx, ny, "STEP 4/5(단기)");
  if (!built.ok) return built.response;

  console.log(`${LOG_PREFIX} [STEP 5/5] 성공(단기예보) — 최종 날씨 데이터`, { ...built.body, source, dateParam });
  return NextResponse.json(built.body);
}
