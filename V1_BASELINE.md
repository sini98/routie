# Routie — v1 기준 문서 (Baseline)

> 스냅샷 시점: 2026-07-08
> 이 문서는 지금까지의 작업을 **v1 기준점**으로 정리한 것입니다. 앞으로의 모든 수정/버그 리포트는 이 문서(그리고 상세 구현은 [README.md](README.md))를 기준으로 비교·진행합니다.

이 저장소에는 git 이력이 없어서(`.git` 없음) 커밋 기반 버전 관리를 쓸 수 없습니다. 그래서 이 문서 자체를 "v1"이라는 텍스트 기준점으로 삼습니다 — 이후 이 문서에 적힌 내용과 다르게 동작하면 "회귀(regression)"로 간주하고, 이 문서에 없는 걸 만들면 "v2 이후 신규 기능"으로 취급하면 됩니다.

## 1. 프로젝트 개요

Routie(루티)는 하루 동안 여러 장소를 방문하는 사용자를 위한 일정 관리 서비스입니다. 여러 장소를 하나의 일정으로 관리하고, 지도에서 방문 순서를 확인하며, 실제 길찾기는 네이버지도로 연결합니다. 로그인/서버 없이 **LocalStorage 기반**으로 동작합니다.

## 2. 기술 스택 (v1 확정)

- **Next.js 14.2.5** (App Router) + **TypeScript** — ⚠️ Vite/React Router가 **아닙니다**. `App.tsx`도 존재하지 않습니다. 라우팅은 `src/app/` 폴더 구조 자체가 곧 라우트입니다.
- **Tailwind CSS** + shadcn/ui 패턴 프리미티브
- **dnd-kit** (드래그 순서 변경), **Framer Motion** (애니메이션)
- **LocalStorage** 유일한 데이터 저장소 (서버/DB 없음)
- 네이버 지도 JavaScript API v3 (키 없으면 Mock Map으로 자동 대체)
- 기상청 공공데이터포털 동네예보 API(초단기예보) — `KMA_API_KEY` 없으면 날씨 영역이 실패 문구로 대체(다른 기능엔 영향 없음)
- **PWA** 대응 (서비스워커는 프로덕션 빌드에서만 등록 — 4.3절 참고)
- **이 폴더는 git 저장소가 아닙니다** (`git status` → `not a git repository`). `git diff`/`git log` 등은 사용할 수 없습니다.

## 3. 화면/라우트 (v1 확정)

| 경로 | 설명 |
|---|---|
| `/` | 홈 — 로고/슬로건 + 메뉴 3개(오늘 외출/지정 외출/즐겨찾기) + 최근 작성한 일정 목록 |
| `/today` | 오늘 날짜로 `/outing/{YYYY-MM-DD}`로 즉시 redirect (`dynamic = "force-dynamic"`) |
| `/outing/[date]` | 지도 + 일정 리스트 + 장소 추가/수정. "오늘 외출"과 "지정 외출"이 공유하는 단일 화면 |
| `/calendar` | 지정 외출 — 월간 달력에서 날짜 선택 → 요약 확인 → `/outing/{날짜}`로 이동 |
| `/favorites` | 즐겨찾기 목록 (항목별 아코디언) |
| `/api/geocode`, `/api/search-place`, `/api/reverse-geocode` | 네이버 API 서버 프록시 3종 (Route Handler, Client Secret 보호) |
| `/api/weather` | 기상청 동네예보 서버 프록시 — 오늘 외출은 초단기예보, 지정 외출은 `date` 파라미터로 그 날짜의 단기예보 (Route Handler, `KMA_API_KEY` 보호) |

모든 페이지 좌상단 `<` 버튼은 항상 `router.push("/")`로 홈 이동입니다.

## 4. 핵심 기능 (v1 확정 동작)

아래는 "지금 정상적으로 동작해야 하는 것"의 목록입니다. 각 항목의 상세 구현/설계 이유는 README.md의 같은 제목 섹션에 있습니다.

1. **홈 화면 로고** — "Routie" 워드마크(짙은 남색), i의 점은 커스텀 핀 아이콘(브랜드 블루), 슬로건("하루 일정을 더 쉽게", 블루), 그 아래 핀 두 개 + 연결선(연한 블루 `#C7D3FF`).
2. **오늘 외출** — 장소 0개일 때만 현재 위치 기반으로 지도 시작(2단계 측위, 실패 시 서울 폴백). 최종 저장 좌표는 항상 사용자가 지도에서 직접 고른 값.
3. **지정 외출(달력)** — 날짜 선택 → "+ 새 외출 만들기" → 그 날짜의 `/outing/[date]`로 이동. 지역 검색은 달력 단계가 아니라 장소 추가 단계(`LocationPicker`)에서 함. 연도 선택 Bottom Sheet 지원.
4. **`/outing/[date]` 화면** — 지도(마커 ①②③ + Polyline) + 일정 리스트(드래그 정렬, 2곳 이상일 때 "카드를 드래그하여 순서를 변경해보세요." 안내 문구가 조건 없이 상시 표시) + 이전/다음 날짜 이동. 헤더 오른쪽 끝에는 오늘일 때만 뜨는 "오늘" 알약(비클릭, `bg-accent`/파란 텍스트)과 항상 뜨는 달력 아이콘 버튼(배경 없음, 검정 아웃라인, `/calendar`로 이동)이 서로 독립된 요소로 나란히 있습니다. **헤더 정보 계층**(`OutingHeader.tsx`)은 굵은 큰 윗줄=날짜(`text-lg font-bold`, 가운데 정렬, 헤더에서 가장 눈에 띔), 작은 아랫줄=날씨 정보(`WeatherBadge.tsx`, 12번 항목 참고)로 구성됩니다. **일정 제목을 헤더에서 수정하는 UI는 현재 없습니다** — 예전엔 날짜 아래 문구를 탭해 제목을 설정했지만, 그 자리가 날씨 정보로 대체되면서 진입점도 함께 제거했습니다. 제목 데이터(`OutingEntry.title`)와 `useOuting()`의 `title`/`setTitle`은 남아 있지만 지금은 어디서도 호출되지 않습니다.
5. **장소 추가/수정** — 입력 필드 순서(위→아래)는 **위치 → 장소명 → 방문 시간 → 메모**뿐입니다(위치 선택 버튼이 폼 상단의 대표 액션으로 항상 맨 위). 위치는 `LocationPicker`(검색 2단계: POI 검색 → 지오코딩, 또는 지도 직접 탭)로 필수 선택. 방문 시간은 `TimePicker`(오전/오후·시·분 3열 휠 스크롤 피커, 분 단위까지 선택 가능)로 선택(선택 사항). 위치 미선택 시 저장 차단(유령 좌표 생성 방지). 시간이 있으면 `insertPlaceByTime`으로 적절한 위치에 자동 삽입(드래그 순서는 건드리지 않음). **즐겨찾기는 폼 필드가 아니라 시트 제목 옆 북마크(아웃라인/채워짐) 아이콘**입니다(`FavoriteBookmarkButton.tsx`) — "장소 추가"/"장소 수정" 둘 다에 있습니다. 아웃라인 상태에서 누르면 `CategoryPickerSheet`(카테고리를 칩으로 선택, "확인"으로 확정)가 열리고, 확인을 누르면 그 즉시(수정 화면) 또는 "추가하기" 제출 시점(추가 화면, `pendingFavoriteCategory`로 임시 보관)에 그 카테고리로 즐겨찾기가 만들어지며 아이콘이 채워집니다. 채워진 상태에서 누르면 카테고리를 다시 묻지 않고 바로 제거되어 아웃라인으로 돌아갑니다. 즐겨찾기 아이콘은 홈 화면의 "즐겨찾기" 메뉴 카드를 포함해 서비스 전체에서 북마크로 통일되어 있습니다(예전 별 아이콘에서 변경).
6. **즐겨찾기/카테고리** — `/favorites`와 장소 추가 시 "저장한 장소 불러오기"(`SavedPlacesPicker`) 둘 다 **카테고리 카드 → 항목별 아코디언**의 2단 구조입니다(카테고리는 여러 개 동시 펼침 가능, 항목은 한 번에 하나만). **다만 항목을 고른 뒤 동작은 다릅니다** — `/favorites`는 그 자리에서 오늘/날짜선택 추가 버튼이 나오고, `SavedPlacesPicker`는 항목을 탭하면 "장소 추가" 폼으로 돌아가 값이 미리 채워지고 사용자가 "추가하기"를 눌러야 실제 반영됩니다(`OutingScreen.tsx`의 `favoriteDraft`, `PlaceForm`의 `initialValue`+`submitLabel="추가하기"`) — 예전엔 탭하는 즉시 확인 없이 바로 추가됐습니다. 카테고리는 `CategoryPickerSheet.tsx`에서 칩(chip) 형태로 관리됩니다 — 기본 카테고리(맛집/카페/가볼 곳, `types/category.ts`의 `DEFAULT_CATEGORIES`)를 포함한 모든 칩을 X로 삭제할 수 있고, +로 새 칩을 추가할 수 있습니다(`useCategories.ts`의 `addCategory`/`removeCategory`; `renameCategory`도 훅에는 있지만 이 칩 UI에는 노출되지 않음). 삭제 확인은 인라인 블록이 아니라 `ConfirmDialog.tsx`(화면 중앙 모달, `LocationPicker`와 같은 중첩 Dialog + `data-routie-overlay` 패턴, z-index 10020/10021)이며, 확인 버튼은 브랜드 블루(기본 `Button` variant, `destructive` 아님)로 강조되어 있습니다. 삭제된 카테고리를 쓰던 즐겨찾기는 "기타"로 자동 이동합니다.
7. **Bottom Sheet 스크롤 + 드래그 리사이즈** (`ui/sheet.tsx`, 모든 `BottomSheet`에 공통 적용) — 시트 내부는 헤더(드래그 핸들+제목, 고정)와 콘텐츠(`min-h-0 flex-1 overflow-y-auto`, 세로 스크롤) 두 영역으로 나뉘어, 내용이 길어져도 하단 요소까지 항상 스크롤로 접근할 수 있습니다. 기본 높이 `88vh`, 제목 위 드래그 핸들을 위로 48px 이상 끌면 `94vh`로 확장, 아래로 48px 이상 끌면 축소(이미 기본 높이면 닫힘) — Framer Motion `dragConstraints={{top:0,bottom:0}}`+`dragElastic`로 핸들 자체는 항상 원위치로 복귀하는 고무줄 드래그이고, 실제 확장/축소/닫힘 판단은 `onDragEnd`의 드래그 거리로 합니다. 드래그 제스처(핸들)와 스크롤 제스처(콘텐츠)는 서로 다른 DOM 요소라 충돌하지 않습니다. 시트를 열 때마다 항상 기본 높이로 시작합니다.
8. **자동 저장** — 모든 데이터가 LocalStorage에 즉시 저장, "마지막 저장: N분 전" 표시.
9. **홈 — 최근 작성한 일정** — 최신 저장순 카드, 이어서 작성/복제/삭제 메뉴.
10. **지도 로딩 최적화** — SDK 프리로드, 스켈레톤 로딩 UI, 위치 조회 중에도 지도 즉시 표시(작은 배지로만 안내), 불필요한 마커 재생성 버그 수정.
11. **메인 컬러 통일** — 선택/강조 표시는 전부 `--primary`(#4F7FFF, 진한 파랑) / `--accent`(연한 파랑) 두 토큰만 사용(TimePicker, Calendar 등).
12. **날씨 정보** (`WeatherBadge.tsx`, `/api/weather`) — 헤더 날짜 아래에 날씨 아이콘 + 현재 기온 + 외출 코멘트 한 줄이 뜹니다. **위치는 `navigator.geolocation.getCurrentPosition`으로 실제 GPS 위경도를 우선 사용**하고, 권한 거부/미지원/조회 실패 시 즉시 `DEFAULT_COORDS`(서울시청, 기상청 격자 nx=60/ny=127)로 대체합니다(`WeatherBadge.tsx`).
    - 서버(`/api/weather`)는 기상청 **API허브(apihub.kma.go.kr)의 `nph-dfs_vsrt_grd`**(예특보 > 단기예보 > 동네예보 > 초단기예보 격자, legacy 텍스트 API — **활용신청이 정확히 이 경로로 승인되어 있음**)를 오늘 외출에 사용합니다. `VilageFcstInfoService_2.0`(JSON REST) 계열, `getUltraSrtNcst`, data.go.kr은 전혀 호출하지 않습니다.
    - **지정 외출(오늘이 아닌 날짜)은 형제 endpoint `nph-dfs_shrt_grd`(단기예보 격자, 같은 authKey 재사용)를 씁니다** — `WeatherBadge`가 `isToday`가 아니면 `/api/weather`에 `&date=YYYY-MM-DD`를 붙이고, `route.ts`는 이 파라미터 유무로 두 흐름을 분기합니다(`date` 없으면 기존 초단기예보 로직 그대로, 있으면 별도 함수 `handleShortTermForecast`). 변수는 TMP/SKY/PTY/PCP(초단기예보의 T1H/SKY/PTY/RN1 자리), 예보시각(`tmef`)은 그 날짜의 정오(1200)로 고정, 최대 조회 범위는 발표 시점부터 3일 뒤까지(`SHRT_MAX_DAYS_AHEAD`)라 그 밖의 날짜는 API를 부르지 않고 바로 `OUT_OF_FORECAST_RANGE`로 응답합니다. ✅ endpoint/파라미터/변수 코드/격자 포맷 전부 실제 승인된 authKey로 호출해 검증됨(`curl ".../api/weather?lat=37.5665&lng=126.978&date=2026-07-11"` → 실제 값 반환 확인). ⚠️ `tmfc`의 "발표 후 10분" 지연 가정과 "3일" 최대 범위만 공식 문서로 재확인 못한 값입니다.
    - **응답이 JSON이 아니라 전국 149(nx)×253(ny) 격자 전체**(콤마 구분 텍스트, 한 줄 20개씩, `-99.00`=데이터 없음)이고, **한 번의 호출 = 변수 하나**(T1H/SKY/PTY/RN1 중 하나)입니다 — `vars`에 쉼표로 여러 개를 한 번에 못 넣어(실측 확인) 4개를 `Promise.all`로 **병렬 호출**합니다(`fetchGridVariable`). 첫 호출은 15~45초 걸리고(같은 `tmfc`는 API허브 쪽에 캐시되어 이후 1초 이내), 순차 호출했다면 4배로 느렸을 것이라 병렬화가 필수적이었습니다.
    - **격자 한 칸(nx, ny) 추출 매핑은 실제 authKey로 검증됨**(`src/lib/kmaGrid.ts`의 `parseKmaGridCell`) — 텍스트의 행 순서는 `ny` 오름차순 직접 대응(뒤집지 않음). 부산(nx=98,ny=76)/제주(nx=53,ny=38)로 검증: 이 방향으로 뽑으면 실제 값, 뒤집으면 두 도시 모두 격자 밖(-99).
    - T1H(기온)/SKY(하늘상태)/PTY(강수형태)/RN1(1시간 강수량, mm 숫자) 4개만 요청 → `describeWeather(sky, pty, rn1)`(`src/lib/weatherPresentation.ts`)로 아이콘·코멘트 매핑 → `{temperature, icon, comment}`만 클라이언트에 반환. RN1은 PTY가 "0"이어도 0보다 크면 강수로 보정하는 보조 신호로만 쓰고, 수치 자체는 화면에 안 보여줍니다. 최고/최저기온(TMX/TMN)은 이 격자에 없는 변수라 다루지 않습니다.
    - `KMA_API_KEY`(=authKey)는 서버에서만 쓰고 브라우저에 노출되지 않으며, URL에 붙일 때 항상 `encodeURIComponent`로 인코딩합니다. 파라미터 오류는 JSON/XML이 아니라 `# input variable error (-1)` 같은 한 줄 주석으로 돌아옵니다.
    - 서버 로그는 `[STEP 1/5]`(KMA_API_KEY 로딩)~`[STEP 5/5]`(최종 데이터 반환)로 나뉘고, 변수별 요청/응답/파싱이 각각 로그에 남습니다. 클라이언트 로그(`[Routie][WeatherBadge]`)는 `[GPS]`→`[위치 확정]`(source: gps|fallback)→`[/api/weather 호출]`→`[최종 날씨 데이터 수신]` 순. **위치 문제와 API 연동 문제를 분리해서 진단**하려면 GPS를 거치지 않고 `curl "http://localhost:3000/api/weather?lat=37.5665&lng=126.978"`로 서울 고정 좌표를 직접 호출.
    - **한 줄 레이아웃**: 로딩/성공/실패 세 상태 모두 같은 한 줄짜리 `<p>`로 통일(헤더 크기가 상태에 따라 커지고 줄어들지 않게 함). 로딩 중 "☀️ 날씨 정보를 불러오는 중입니다."(첫 호출은 최대 수십 초까지 정상), 실패(키 미설정/미승인 포함) 시 "☁️ 날씨 정보를 가져올 수 없습니다.", 성공 시 "{아이콘} {기온}℃ · {코멘트}"(예: "🌧️ 24℃ · 비가 와요. 우산을 챙기세요.") 형태로 아이콘/기온/코멘트가 한 행에 표시됩니다. 날짜(`text-lg font-bold`)가 헤더에서 가장 눈에 띄는 정보로 유지되고, 날씨는 그 아래 보조 정보 크기로 유지됩니다.

## 5. 데이터 모델 (v1 확정)

```ts
type Place = { id: string; name: string; time?: string; memo?: string; lat: number; lng: number };
type OutingEntry = { title: string | null; places: Place[]; updatedAt: number };
type OutingMap = Record<string, OutingEntry>; // localStorage key: "routie:outings"

type FavoritePlace = { id: string; name: string; category?: string; memo?: string; lat: number; lng: number };
// localStorage key: "routie:favorites"
```

관련 localStorage key 전체: `routie:outings`, `routie:favorites`, `routie:categories`, `routie:defaultRegion`.

## 6. 폴더 구조 (v1 확정)

전체 파일 목록/역할은 README.md의 "폴더 구조" 섹션이 최신 상태로 유지됩니다. 요약:

```
src/
  app/            # 라우트 (page.tsx가 곧 화면)
  components/     # UI 컴포넌트
  hooks/          # useLocalStorage 기반 커스텀 훅
  lib/            # 순수 함수/유틸
  types/          # 타입 정의
public/           # manifest.json, sw.js, icon.svg
```

## 7. 개발 환경 관련 — 반드시 숙지할 것

이번 세션에서 실제로 겪은 문제들이라, 앞으로 같은 문제를 피하려면 아래를 지켜야 합니다.

- **이 프로젝트는 git 저장소가 아닙니다.** `git status`/`git diff`/`git log`로 되돌리기가 불가능합니다. 되돌림이 필요하면 코드를 직접 이전 상태로 재작성해야 합니다.
- **Vite/React Router 관련 파일은 존재하지 않습니다.** `App.tsx`, `react-router-dom` 등을 찾거나 수정하려 하면 안 됩니다 — Next.js App Router의 파일시스템 라우팅만 존재합니다.
- **`npm run build`(프로덕션)와 `npm run dev`(개발)를 같은 `.next` 폴더에 대해 동시에 실행하면 안 됩니다.** 라이브 `npm run dev` 프로세스가 떠 있는 상태에서 `npm run build`를 실행하거나 `.next`를 지우면, 실행 중이던 dev 서버가 오래된 인메모리 상태와 새 `.next` 내용이 어긋나면서 **실제로 존재하는 라우트가 404를 내거나, JS/CSS 정적 자산이 전부 404가 나서 화면이 하얗게(또는 스타일 없이 깨져) 보이는 문제**가 실제로 발생했습니다. 코드를 검증하고 싶으면 먼저 `netstat`으로 3000번 포트에 살아있는 프로세스가 있는지 확인하세요.
- **PWA 서비스워커**(`public/sw.js`)는 개발 모드에서 화이트스크린의 흔한 원인입니다. `PwaRegister.tsx`가 개발 모드에서는 자동으로 서비스워커를 정리하도록 되어 있지만(7.1 참고), 이미 오래된 서비스워커가 페이지 JS 자체를 캐시로 막고 있다면 그 자동 정리 코드조차 실행되지 못할 수 있습니다 — 그때는 브라우저 개발자 도구에서 수동으로 Service Worker Unregister + Cache Storage 삭제가 필요합니다(README.md "PWA 서비스워커와 로컬 개발 시 흰 화면 문제" 섹션 참고).
- **Vercel 배포와 로컬 상태가 다를 수 있습니다.** 이 로컬 폴더가 실제로 어떤 Git 저장소/Vercel 프로젝트와 연결되어 있는지 확인되지 않았습니다 — 배포본과 로컬이 다르게 보인다면 먼저 Vercel 대시보드의 Deployments 탭에서 실제로 어떤 커밋이 배포됐는지, Root Directory 설정이 맞는지 확인이 필요합니다.
- **오래 떠 있는 `npm run dev` 프로세스는 결국 응답을 멈출 수 있습니다.** 이번 세션에서 아주 오랫동안(수십 번의 코드 변경) 켜둔 dev 서버가 어느 시점부터 `GET /`처럼 아무 요청에도 60초 넘게 응답하지 않는 상태가 됐습니다. 그 전까지 계속 나타났던 `Caching failed for pack: ENOENT ...` 웹팩 캐시 경고(`.next/cache/webpack/...`)가 누적된 결과로 추정됩니다. 해결: 프로세스 종료 → **dev 서버가 완전히 꺼진 상태**에서 `.next` 폴더 삭제(빌드 캐시일 뿐이라 삭제해도 데이터 손실 없음) → `npm run dev` 재시작. 재시작 후에는 캐시 경고 없이 깨끗하게 컴파일됐습니다.
- **`.env.local`은 dev 서버를 켜둔 채로 수정해도 Next.js가 자동으로 다시 읽습니다**(로그에 `Reload env: .env.local`로 표시). 다만 확실하게 반영됐는지 검증하려면 서버를 재시작하는 편이 안전합니다.
- **삭제해도 새로고침하면 다시 나타나는 버그를 실제로 겪고 고쳤습니다** (`src/hooks/useLocalStorage.ts`): 같은 localStorage key를 쓰는 `useLocalStorage` 인스턴스가 한 화면에 여러 개 동시에 마운트되어 있으면(예: `/favorites` 페이지 자신 + 그 안에서 쓰는 `useCategories()`가 내부적으로 한 번 더 부르는 `useFavorites()`), 한쪽이 실제로 삭제/저장한 직후 다른 쪽의 **마운트 시점 읽기 → 재확인 저장**이 그 삭제를 오래된 값으로 덮어써버렸습니다. 원인은 write effect의 "이 값을 진짜 새로 바꾼 건지" 판단 플래그(`isExternalUpdate`)가 pub/sub으로 받은 값에만 걸려 있고, 마운트 시 localStorage에서 막 읽어온 값에는 안 걸려 있었기 때문입니다. 수정: 마운트 read effect에서도 `setValue` 호출 직전에 이 플래그를 표시해, "방금 저장소에서 읽어온 값은 다시 쓸 필요 없다"는 걸 명확히 합니다. 이 훅을 쓰는 모든 데이터(일정 장소, 즐겨찾기, 카테고리, 기본 지역 등)에 공통 적용됩니다. 실제로 브라우저에서 `console.log` 계측으로 재현·확인 후 고쳤습니다.

## 8. 알려진 기술 부채 (v1 시점, 아직 정리 안 됨)

- `src/lib/naver.ts`의 `searchNaverPlace()`는 항상 빈 배열만 반환하는 죽은 코드입니다. 실제 장소 검색은 `app/api/search-place` + `src/lib/geocode.ts`의 `searchPlaces()`가 담당합니다 — 아무도 이 dead code를 참조하지 않지만, 아직 삭제하지는 않았습니다.
- `src/components/Map/NaverMap.tsx`의 한 `useEffect`에 `react-hooks/exhaustive-deps` ESLint 경고가 있습니다(의도적으로 의존성 배열을 비워둔 것 — 무한 루프 방지 목적). 기능상 문제는 없지만 빌드 로그에 경고로 남습니다.
- `app/api/reverse-geocode`의 NCP 응답 필드 파싱 로직은 실제 NCP 계정 응답으로 검증되지 않았습니다(README.md 참고).

## 9. 이번 세션 백업

이 문서를 만들기 직전 시점의 프로젝트 전체가 아래 경로에 그대로 복사되어 있습니다.

```
C:\Users\FAMILY\Desktop\routie-app-backup-20260708-210810
```

문제가 생기면 이 백업 폴더와 현재 폴더를 파일 단위로 비교(diff)할 수 있습니다.

## 10. 앞으로의 작업 방식

- 새 요청은 "이 문서의 몇 번 항목을 바꾸는지"를 기준으로 설명하면 가장 정확하게 작업할 수 있습니다.
- 상세 구현 이유/과거 버그 히스토리가 궁금하면 README.md를 참고하세요 — 이 문서는 README.md를 대체하지 않고, README.md의 "현재 상태 요약본" 역할만 합니다.
- README.md는 계속 자세한 기술 문서로 갱신되고, 이 문서(V1_BASELINE.md)는 큰 변경(v2 등)이 있을 때만 갱신하는 것을 권장합니다.
