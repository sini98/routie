/**
 * 기상청 동네예보 API는 위경도가 아니라 자체 격자(기상청 Lambert Conformal Conic 도법)
 * 좌표(nx, ny)를 요구합니다. 기상청이 공개한 변환 공식(격자 간격 5km, 기준 위경도 등 상수)을
 * 그대로 옮긴 것으로, 이 앱 특유의 로직은 없습니다.
 */
export type KmaGrid = { nx: number; ny: number };

const RE = 6371.00877; // 지구 반경(km)
const GRID = 5.0; // 격자 간격(km)
const SLAT1 = 30.0; // 투영 위도1(degree)
const SLAT2 = 60.0; // 투영 위도2(degree)
const OLON = 126.0; // 기준점 경도(degree)
const OLAT = 38.0; // 기준점 위도(degree)
const XO = 43; // 기준점 X좌표(GRID)
const YO = 136; // 기준점 Y좌표(GRID)
const DEGRAD = Math.PI / 180.0;

export function latLngToKmaGrid(lat: number, lng: number): KmaGrid {
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  const ra0 = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  const ra = (re * sf) / Math.pow(ra0, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx, ny };
}

// 기상청 API허브의 nph-dfs_vsrt_grd(초단기예보 격자) 텍스트 응답 전체(전국 149×253칸)에서
// 특정 한 칸(nx, ny)의 값만 뽑아냅니다. 격자 한 행(149칸)이 한 줄에 다 안 들어가서 한 줄당
// 최대 20개 값씩 여러 줄로 줄바꿈되어 옵니다(149 = 20*7 + 9, 즉 행마다 8줄).
//
// 아래 상수/줄바꿈 규칙과 "줄 순서 = ny 오름차순(직접 매핑, 뒤집지 않음)"은 추측이 아니라
// 실제 authKey로 살아있는 API를 호출해 검증했습니다 — 부산(nx=98,ny=76)과 제주(nx=53,ny=38)
// 좌표를 이 규칙으로 뽑으면 실제 기온 값이 나오고, 행 순서를 뒤집어서 뽑으면 두 도시 모두
// 격자 범위 밖(-99, 데이터 없음)으로 나가버립니다 — 부산/제주는 실제로는 육지·해안 도시라
// 값이 있어야 정상이므로, 뒤집지 않는 쪽이 맞는 매핑입니다.
const GRID_NX = 149;
const GRID_NY = 253;
const VALUES_PER_LINE = 20;
const LINES_PER_ROW = Math.ceil(GRID_NX / VALUES_PER_LINE); // 8

export type KmaGridParseResult = { value: number } | { error: string };

/** nph-dfs_vsrt_grd 원본 텍스트에서 (nx, ny) 한 칸의 값을 읽습니다. -99는 "데이터 없음" 그대로 반환합니다. */
export function parseKmaGridCell(rawText: string, nx: number, ny: number): KmaGridParseResult {
  const trimmed = rawText.trim();
  if (trimmed.startsWith("#")) {
    // 기상청 API허브의 이 legacy 엔드포인트는 파라미터 오류를 JSON/XML이 아니라
    // "# input variable error (-1)"류의 한 줄 주석으로 돌려줍니다.
    return { error: trimmed.slice(0, 200) };
  }

  const lines = trimmed.split("\n").filter((line) => line.trim().length > 0);
  const expectedLines = GRID_NY * LINES_PER_ROW;
  if (lines.length !== expectedLines) {
    return { error: `줄 수가 예상과 다릅니다 (got ${lines.length}, expected ${expectedLines})` };
  }

  if (nx < 1 || nx > GRID_NX || ny < 1 || ny > GRID_NY) {
    return { error: `격자 범위를 벗어났습니다 (nx=${nx}, ny=${ny})` };
  }

  const rowIndex = ny - 1; // 직접 매핑(뒤집지 않음) — 위 검증 내용 참고
  const rowLines = lines.slice(rowIndex * LINES_PER_ROW, (rowIndex + 1) * LINES_PER_ROW);
  const rowValues = rowLines.flatMap((line) =>
    line
      .trim()
      .split(",")
      .map((token) => token.trim())
      .filter((token) => token.length > 0)
      .map(Number)
  );

  if (rowValues.length !== GRID_NX) {
    return { error: `행 값 개수가 예상과 다릅니다 (got ${rowValues.length}, expected ${GRID_NX})` };
  }

  const value = rowValues[nx - 1];
  if (Number.isNaN(value)) {
    return { error: `(nx=${nx}, ny=${ny}) 값이 숫자가 아닙니다` };
  }

  return { value };
}
