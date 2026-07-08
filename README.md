# Routie (루티)

> 하루 일정을 더 쉽게

Routie는 하루 동안 여러 장소를 방문하는 사용자를 위한 일정 관리 서비스입니다. 기존 지도 서비스는 길찾기에는 강점이 있지만, 여러 장소를 하나의 일정으로 관리하거나 방문 순서를 한눈에 확인하는 경험은 부족합니다.

Routie는

- 여러 장소를 하나의 일정으로 관리하고
- 지도에서 방문 순서를 직관적으로 확인하며
- 길찾기는 네이버지도를 이용하는

서비스입니다.

## 기술 스택

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + shadcn/ui 패턴 프리미티브(Button, Input, Textarea, Label, Sheet)
- **dnd-kit** — Drag & Drop 방문 순서 변경 (Pointer + Touch + Keyboard 센서)
- **Framer Motion** — Bottom Sheet, Card Hover, Marker 선택 애니메이션
- **LocalStorage** 기반 날짜별 데이터 저장
- 네이버 지도 JavaScript API v3, **PWA** 대응

## 기본 지역 설정

홈 화면은 **오늘 외출 / 지정 외출 / 최근 작성한 일정** 3가지로 단순하게 유지하고, 지역/위치를 정하는 방법은 두 화면의 성격에 맞게 나눠뒀습니다: 오늘 외출은 "현재 위치 기반으로 빠르게 시작", 지정 외출은 "날짜만 먼저 고르고, 실제 지역/장소 검색은 일정 편집 화면에서". 이 둘은 **서로 다른 상태를 씁니다** — 아래 "두 값을 분리한 이유" 참고.

- **오늘 외출 — 현재 위치로 빠르게 시작** (`useAutoLocate.ts`, `OutingScreen.tsx`, `NaverMap.tsx`의 `currentLocationOnly` prop): 오늘 날짜 일정에 장소가 **하나도 없을 때만** 동작합니다(장소가 있으면 절대 건드리지 않습니다).
  - 위치 권한이 이미 **허용**되어 있으면, 화면 진입 시 조용히 현재 위치를 가져와(`useAutoLocate`가 반환하는 `currentLocation`, 컴포넌트 state일 뿐 localStorage에 저장되지 않음) 지도를 그 위치로 중심 이동합니다. 매번 오늘 화면에 들어올 때마다 새로 조회하므로(앱 최초 1회만 물어보는 것과 다름), 다른 지역으로 이동해도 그날의 시작 위치가 최신 상태를 반영합니다.
  - **2단계 측위** (`useAutoLocate.ts`의 `fetchPositionWithFallback`): 1차로 `enableHighAccuracy: true`(GPS 우선, `timeout: 8초`, `maximumAge: 0`)로 시도하고, 실패하면(권한 거부는 재시도해도 의미가 없으니 제외) `enableHighAccuracy: false`(Wi-Fi/IP 기반 표준 정확도)로 한 번 더 시도합니다. 데스크톱/노트북처럼 GPS 칩이 없는 기기에서는 high accuracy 요청이 오히려 응답이 느리거나 타임아웃/실패로 끝나는 경우가 있어서, 그 경우 서울로 완전히 폴백하기 전에 더 가벼운 측위로 한 번 더 시도해 "위치는 못 찾았지만 아예 엉뚱한 도시로 떨어지는" 상황을 줄입니다. 그래도 몇백 미터 오차가 날 수 있으므로, **현재 위치는 어디까지나 지도의 시작점(힌트)일 뿐** — 자동으로 잡은 좌표를 장소로 저장하는 게 아니라 지도 중심만 옮겨주고, 위치를 성공적으로 가져왔을 때는 지도 위에 "현재 위치를 기준으로 지도를 불러왔어요. 정확한 위치는 지도에서 조정해 주세요." 안내를 띄워, 오차가 있을 수 있다는 걸 매번 알려줍니다.
  - 권한이 아직 **결정되지 않은 상태**(prompt)면 자동으로 팝업을 띄우지 않고, 지도 위에 "현재 위치로 시작하기" 안내 버튼을 보여줍니다. 이 버튼을 눌러야(실제 사용자 클릭이 있어야) 브라우저 권한 팝업이 뜹니다 — 화면에 들어올 때마다 원치 않는 팝업이 뜨는 것을 막기 위해서입니다.
  - 권한이 **거부**되었거나 위치를 가져오지 못하면 **서울(`DEFAULT_COORDS`)**을 씁니다 — 아래 이유로 지정 외출에서 검색해둔 지역(`routie:defaultRegion`)은 여기서 폴백으로도 쓰지 않습니다.
  - 지도가 이미 만들어진 뒤에 위치 정보가 나중에(비동기로) 도착해도 반영되도록, `NaverMap.tsx`에 이 값 변경을 감지해 지도 중심을 다시 옮기는 effect가 별도로 있습니다(장소가 없을 때만 동작).
  - **위치 조회 중에도 지도는 바로 보입니다.** 예전에는 `useAutoLocate`의 `status`가 `"checking"`인 동안 지도를 불투명 오버레이로 완전히 가렸는데, 위치 조회가 최악의 경우 8초 x 2단계(고정밀 실패 후 표준 정밀도 재시도)까지 걸릴 수 있어 그동안 화면이 "멈춘 것처럼" 보이는 문제가 있었습니다. 지금은 지도를 서울 기본값 등으로 즉시 그리고, 그 위에 작은 배지("현재 위치를 확인하는 중...")만 얹어 안내합니다. 실제 위치가 도착하면 지도가 `panTo`로 부드럽게 그 위치까지 이동합니다(순간 이동이 아님). 자세한 최적화 내용은 아래 "## 지도 로딩 체감 속도 최적화" 참고.
  - **최종 위치는 항상 사용자가 지도에서 직접 확정한 좌표입니다.** 현재 위치는 지도 중심만 옮길 뿐 그 자체로 어떤 장소로도 저장되지 않고, 실제 장소를 추가할 때는 여느 때처럼 "+" → 장소 추가 → `LocationPicker`에서 검색/직접 탭으로 정확한 지점을 찍고 "이 위치로 선택"을 눌러야 저장됩니다(`PlaceForm.tsx`의 `handleConfirmLocation`이 그 좌표를 그대로 씁니다 — 행정동 이름으로 되짚어 변환하는 단계가 없어서, 자동으로 잡힌 지역명이 틀리더라도 저장되는 좌표 자체는 항상 정확합니다).
- **지정 외출 — 달력은 날짜만, 지역/장소 검색은 일정 편집 화면에서** (`app/calendar/page.tsx`): 실제 사용 흐름이 "날짜 선택 → 새 외출 만들기 → 일정 편집 → 장소 검색"이라, 달력에서 날짜를 고른 직후에 지역 검색창부터 보여주는 건 이 단계에서 의미가 없고 오히려 혼란을 줬습니다. 지금은 아직 일정이 없는 날짜를 고르면 요약 카드에 "예정된 외출이 없어요" + **"+ 새 외출 만들기"** 버튼만 뜨고, 누르면 바로 그 날짜의 외출 화면(`/outing/{날짜}`)으로 이동합니다. 실제 지역/장소 검색은 그 화면에서 "+" → 장소 추가 → `LocationPicker`의 검색창(카페/역/상호명까지 지원, `searchPlaces` + `geocodeQuery` fallback)으로 진행합니다.
  - 예전에는 이 자리에 `RegionSearch.tsx`라는 별도 지역 검색창이 있어서, 검색한 지역을 기본 지역(`routie:defaultRegion`)으로 미리 저장해두는 방식이었습니다. 이제 그 컴포넌트는 삭제했습니다(다른 곳에서도 쓰이지 않았습니다) — 장소를 추가할 때 이미 `LocationPicker`에서 원하는 지역/장소를 검색할 수 있어서, 이 단계를 따로 거칠 필요가 없어졌습니다.
  - 더 예전에는 홈 화면에 이 검색창이 있었고, 그보다 더 예전에는 위치 권한을 거부하면 고정된 8개 도시(서울/대구/부산/거제/제주/광주/대전/인천) 중에서만 골라야 했습니다(목록에 없는 지역은 선택 불가). 지역/장소를 정하는 지점이 이렇게 계속 정리/이동해왔습니다.
- **`currentLocation`(오늘 외출)과 `routie:defaultRegion`(지정 외출/최초 실행)을 완전히 분리한 이유**: 예전에는 `useAutoLocate`가 현재 위치를 얻으면 `routie:defaultRegion`에 그대로 저장했습니다. 그런데 이 값은 (지금은 삭제된) 지정 외출 지역 검색 기능과 **같은 localStorage key를 공유**하고 있어서, 예를 들어 지정 외출 달력에서 (테스트든 실제든) "대구"를 한 번 검색해두면, 그 값이 계속 남아있다가 며칠 뒤 "오늘 외출"에 들어갔을 때도 "저장된 기본 지역"으로 다시 읽혀서 지도가 대구로 뜨는 문제가 있었습니다(실제 위치는 서울이고 권한도 허용돼 있었는데도). `useAutoLocate`가 반환하는 `currentLocation`은 이제 이 훅 안의 컴포넌트 state일 뿐 `routie:defaultRegion`을 읽지도 쓰지도 않고(`NaverMap`에도 `currentLocationOnly`라는 별도 prop으로 전달), `routie:defaultRegion`은 최초 실행(`RegionSetup`) 전용으로만 남습니다. 그래서 `routie:defaultRegion`을 앱 시작 시 강제로 지우는 마이그레이션은 넣지 않았습니다 — 이미 들어있는 예전 값(예: 테스트로 검색했던 대구)이 있어도, 이제 오늘 외출은 그 값을 아예 보지 않으므로 더 이상 영향을 주지 않습니다.
- **앱 최초 진입 시 위치 권한 감지** (`RegionSetup.tsx`, 루트 레이아웃에 마운트): 최초 1회, 조용히 위치 권한을 요청해 허용되면 기본 지역을 저장합니다. 거부/미지원이거나 이미 기본 지역이 있으면 아무 화면도 띄우지 않습니다.
- 이 기본 지역은 **일정에 장소가 하나도 없을 때만** 지도/위치 선택 화면의 초기 중심으로 쓰입니다. 장소가 하나라도 있으면 항상 그 장소 좌표가 우선합니다(`src/hooks/useDefaultRegion.ts`).
- **디버깅 로그**: `useAutoLocate.ts`/`NaverMap.tsx`/`useDefaultRegion.ts`/`OutingScreen.tsx`에 `[Routie][Debug]`로 시작하는 로그가 남아 있습니다. 지도 중심이 왜 그렇게 정해졌는지는 `NaverMap`이 찍는 `finalCenter`/`reason` 로그로 바로 확인할 수 있고, `reason`은 `"currentLocation"`(현재 위치 조회 성공) / `"defaultLocation"`(서울 fallback — 조회 실패·거부·미지원일 때만) / `"savedRegion"`(지정 외출 등에서 defaultRegion을 쓰는 화면) / `"savedItinerary"`(일정에 저장된 장소 기준) 중 하나로 통일돼 있습니다.

### 알아둘 버그 수정: useLocalStorage 인스턴스 간 동기화

한때 "위치 권한을 허용했고 실제 위치는 서울인데, 오늘 외출 화면은 예전에 검색했던 다른 지역(예: 대구)에 멈춰 있는" 문제가 있었습니다. 원인은 하드코딩된 좌표가 아니라 **`useLocalStorage`가 컴포넌트 인스턴스마다 완전히 독립된 React state였다는 것**이었습니다 — `OutingScreen`의 `useAutoLocate`가 현재 위치를 가져와 `setDefaultRegion(...)`을 호출해도, `NaverMap`이 자기 자신의 `useDefaultRegion()` 호출로 들고 있던 예전 값(예: 지역 검색 테스트로 저장돼 있던 대구 좌표)은 그 사실을 전혀 알지 못했습니다. 같은 localStorage key를 쓰는 두 개의 서로 다른 `useState`였을 뿐, 서로 구독하지 않았기 때문입니다.

지금은 `src/hooks/useLocalStorage.ts`에 모듈 전역 pub/sub을 추가해, 같은 key를 쓰는 모든 `useLocalStorage` 인스턴스가 값 변경을 즉시 공유합니다(`useOutings`/`useFavorites`/`useCategories`/`useDefaultRegion` 등 이 훅을 쓰는 모든 곳에 자동 적용됩니다). 어느 한 컴포넌트가 저장하면 같은 key를 구독 중인 다른 모든 컴포넌트가 같은 렌더 사이클 안에서 최신 값을 받습니다.

같은 조사 과정에서 두 번째 원인도 찾았습니다: `useOuting`이 "오늘" 날짜에 처음 들어올 때마다 예시 장소 3곳(`INITIAL_PLACES` — 서울아산병원/잠실 카페/저녁식사)을 자동으로 채워 넣고 있었습니다. 이러면 오늘 일정이 "장소 0개"인 순간이 사실상 없어서, 현재 위치 기준 시작 로직이 거의 항상 건너뛰어지고 — 특히 개발 중 **localStorage를 지워도 매번 예시 데이터가 다시 채워져 현재 위치 동작을 테스트하기 어려웠습니다.** 이 자동 채우기를 완전히 제거해, 이제 오늘 일정은 정말로 비어 있는 채로 시작합니다(장소가 없으면 `EmptyState`가 뜨고, 지도는 `useAutoLocate`가 현재 위치를 기준으로 보여줍니다). **개발 중 테스트 팁**: 브라우저 개발자 도구에서 이 사이트의 로컬 저장소(또는 전체 사이트 데이터)를 지운 뒤 새로고침하면, 예시 데이터 없이 정말 빈 상태로 시작하고 위치 권한이 허용돼 있다면 현재 위치를 기준으로 바로 시작됩니다.

## 지도 로딩 체감 속도 최적화

오늘/지정 외출 화면 진입 시 지도가 뜨기까지 느리게 느껴진다는 피드백을 반영해 아래 6가지를 손봤습니다. 실제 로딩 시간 자체를 줄이는 것과, "멈춘 것처럼 보이지 않게" 체감 속도를 개선하는 것 둘 다를 목표로 했습니다.

1. **SDK 스크립트 프리로드** (`NaverMapsPreloader.tsx`, 루트 레이아웃에 마운트): 홈 화면 등 앱 어디에 들어오든 네이버 지도 SDK 스크립트(`useNaverMapsLoader`)를 곧바로 로드하기 시작합니다. `useNaverMapsLoader`는 `<script id="naver-map-sdk">` 태그로 중복 로드를 막기 때문에, 실제로 오늘/지정 외출 화면에 들어갔을 때 호출되는 `useNaverMapsLoader`는 이미 로드됐거나 로드 중인 같은 스크립트를 그대로 재사용합니다 — 지도 화면에 들어가는 시점엔 SDK가 이미 준비돼 있을 가능성이 높습니다. 루트 레이아웃(`app/layout.tsx`)에 `<link rel="preconnect" href="https://oapi.map.naver.com" />`도 추가해 DNS/TLS 협상도 미리 끝내둡니다.
2. **지도 API 로딩과 현재 위치 조회는 원래도 동시에 진행됩니다**: `<Map>`은 위치 조회 상태와 무관하게 항상 마운트되고, `useAutoLocate`도 같은 렌더에서 바로 호출되므로 SDK 스크립트 로딩과 GPS/Wi-Fi 위치 조회가 병렬로 진행됩니다. 문제는 이 병렬 진행 자체가 아니라 아래 6번(화면을 가리는 방식)이었습니다.
3. **지도 준비 전 로딩 UI를 스켈레톤으로 교체** (`Map/index.tsx`): SDK 로딩+지도 인스턴스 생성이 끝나기 전(`status === "loading"`)에는 정적인 "지도를 불러오는 중..." 문구만 있던 것을, 은은한 펄스(`animate-pulse`) 그라디언트 배경 + 스피너 + 문구로 바꿨습니다. 가만히 멈춘 화면보다 "뭔가 계속 진행 중"이라는 인상을 줍니다.
4. **불필요한 지도 재생성 없음(확인/유지)**: `NaverMap.tsx`의 지도 생성 effect는 `mapRef.current`가 이미 있으면 항상 즉시 반환합니다 — 화면 재렌더/부모 리렌더가 아무리 일어나도 같은 화면에서는 `naver.maps.Map` 인스턴스를 다시 만들지 않고 기존 인스턴스를 계속 재사용합니다. 새 지도 인스턴스는 그 화면이 실제로 언마운트-재마운트될 때만 생깁니다(예: Bottom Sheet를 닫았다 다시 열기).
5. **마커/폴리라인이 관계없는 리렌더로 다시 그려지던 버그 수정** (`LocationPicker.tsx`): `Map`에 넘기는 `onSelectPlace`/`onPickLocation` 콜백이 매 렌더마다 새로 만들어지는 인라인 함수(`() => {}`, 클로저)였습니다. `NaverMap.tsx`의 마커/폴리라인 effect는 이 콜백들도 의존성 배열에 포함하기 때문에, 예를 들어 위치 선택 화면(큰 지도) 검색창에 한 글자씩 타이핑할 때마다(그때마다 `LocationPicker`가 리렌더되어 콜백 참조가 바뀜) 장소 목록이 전혀 안 바뀌었는데도 마커/폴리라인을 통째로 지웠다가 다시 그리고 있었습니다. `handlePickLocation`/`suggestNameFromCoords`를 `useCallback`으로, `onSelectPlace`는 모듈 스코프 상수 `noop`으로 고정해 참조가 항상 같게 만들었습니다 — 이제 마커/폴리라인은 실제로 장소 목록이나 선택 상태가 바뀔 때만 다시 그려집니다.
6. **"멈춘 것처럼" 보이지 않게 — 위치 조회 중에도 지도를 바로 표시**: `OutingScreen.tsx`/`LocationPicker.tsx` 둘 다 예전에는 `useAutoLocate`의 `status === "checking"`인 동안(최악의 경우 8초 × 2단계) 지도를 불투명 오버레이로 완전히 가렸습니다. 지금은 지도를 즉시 보여주고(서울 기본값 등으로 시작) 그 위에 작지 않은 배경을 가리지 않는 작은 배지("현재 위치를 확인하는 중...")만 얹습니다. 실제 위치가 도착하면 `NaverMap.tsx`가 `setCenter` 대신 `panTo`로 부드럽게 이동시켜, 순간적으로 "튀는" 느낌 없이 자연스러운 전환처럼 보이게 했습니다(지도 최초 생성 시의 초기 중심 지정은 애니메이션이 필요 없어 그대로 `setCenter`를 씁니다).

## 화면 구성

```
/            홈 — 로고/슬로건 + 3개 메뉴(오늘 외출/지정 외출/즐겨찾기 장소) + 최근 작성한 일정 목록
/today       오늘 날짜로 /outing/[오늘 날짜]로 리다이렉트 (진입 시 현재 위치 자동 반영 시도)
/outing/[date]  지도 + 일정 리스트 + 장소 추가 (오늘 외출, 지정 외출 공통 화면)
/calendar    지정 외출 — 월간 달력에서 날짜 선택 → 요약 확인(비어있는 날짜면 지역 검색도 표시) → 일정 화면 이동
/favorites   즐겨찾기 장소 목록 — "오늘 외출에 추가" 버튼 제공
```

`/outing/[date]` 하나의 화면을 "오늘 외출"과 "지정 외출" 양쪽에서 공유합니다. `/today`는 매 요청마다 오늘 날짜를 계산해 `/outing/{YYYY-MM-DD}`로 보내주는 얇은 리다이렉트 라우트입니다.

`/outing/[date]` 화면 상단에는 `< 7월 7일 (월) >` 형태로 이전/다음 날짜 이동 버튼이 있어, 날짜를 하루씩 옮겨가며 각 날짜의 일정을 바로 확인/편집할 수 있습니다(URL도 `/outing/YYYY-MM-DD`로 함께 바뀝니다). 오늘 날짜에는 "오늘" 뱃지가 표시됩니다.

`/outing/[date]`, `/calendar`, `/favorites` 화면 맨 왼쪽 상단의 `<` 버튼은 항상 `router.push("/")`로 **홈으로 이동**합니다(브라우저 히스토리에 `/`를 새로 쌓는 방식이라, 이후 브라우저 자체의 뒤로가기 동작에는 영향을 주지 않습니다).

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다.

## 네이버 지도 API 설정 방법

1. 프로젝트 루트에 `.env.local` 파일을 만듭니다 (`.env.local.example` 참고).

   ```bash
   cp .env.local.example .env.local
   ```

2. [네이버클라우드플랫폼](https://www.ncloud.com/) 콘솔 > AI·NAVER API > Application에서 **Maps**(Web Dynamic Map) 서비스를 사용 설정하고 Client ID를 발급받습니다. Application 등록 시 서비스 URL(`http://localhost:3000`, 배포 도메인)을 반드시 등록해야 지도가 로드됩니다.
3. 장소 검색(위치 선택 화면의 검색창)을 쓰려면 **Geocoding** 서비스도 사용 설정하고 Client ID/Secret을 발급받습니다(지도용 Application과 같아도 되고, 별도 Application이어도 됩니다).
4. `.env.local`에 값을 입력합니다.

   ```
   NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=지도 JS SDK용 클라이언트 ID
   NAVER_MAP_CLIENT_ID=Geocoding용 클라이언트 ID
   NAVER_MAP_CLIENT_SECRET=Geocoding용 클라이언트 시크릿
   ```

   `NAVER_MAP_CLIENT_ID`/`NAVER_MAP_CLIENT_SECRET`에는 절대 `NEXT_PUBLIC_` 접두사를 붙이지 마세요. 그 접두사가 붙은 환경변수는 Next.js가 브라우저에 그대로 노출시키기 때문에, Secret을 서버에만 두려는 목적이 무의미해집니다. 이 두 값은 `app/api/geocode` 라우트(서버)에서만 사용합니다. 지도 JS SDK는 계속 공개용 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`만 사용합니다.
5. 개발 서버를 재시작하면 실제 네이버 지도와 장소 검색이 표시됩니다. `NAVER_MAP_CLIENT_SECRET`이 없어도 지도/위치 직접 선택 기능은 정상 동작하고, 검색만 비활성됩니다.

### 지도 로딩 동작 (`src/components/Map`)

- `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`가 없으면: 곧바로 **Mock Map**을 표시하고, 하단에 "지도 API 미설정: Mock Map으로 표시 중" 문구를 작게 표시합니다.
- 값이 있으면: 네이버 지도 스크립트(`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=...`)를 `<script>` 태그로 동적 로드합니다. 로딩 중에는 지도 영역에 **"지도를 불러오는 중..."**을 표시하고, `window.naver.maps`가 완전히 준비된 뒤에만 지도를 생성/조작합니다.
- 스크립트 로딩에 실패하면(`onerror`) 자동으로 Mock Map으로 전환되어 앱이 깨지지 않습니다.
- Mock Map도 실제 지도와 동일하게 좌표를 정규화해 ①②③ 순번 마커와 동선(점선)을 그려주고, 마커 클릭/카드 강조가 동일하게 동작합니다.
- 네이버 지도가 자체적으로 붙이는 저작권(© NAVER Corp.)/로고/축척 UI가 다른 화면 요소 위로 튀어나오지 않도록, `Map` 컴포넌트의 지도 wrapper에 `isolate`(새 stacking context 생성) + `overflow-hidden`을 적용했습니다. 이 wrapper는 항상 z-index 0으로 격리되어, 지도 내부 UI가 아무리 높은 z-index를 쓰더라도 Bottom Sheet(`z-[9999]`/`z-[10000]`)나 위치 선택 화면(`z-[10010]`), 일정 리스트(`z-10`) 위로 절대 올라올 수 없습니다.

### 지도 동작 상세

- 일정의 `lat`/`lng`로 커스텀 HTML 마커(①②③ 숫자, 지름 22px)를 그립니다. 경로(Polyline)와 색이 겹쳐 화면이 무거워 보이지 않도록, 마커는 **흰색 배경 + 브랜드 블루(`--primary`) 숫자 + 옅은 회색(#E5E7EB) 테두리**로 표시합니다. 선택된 마커는 배경을 채우는 대신 테두리를 브랜드 블루로 바꾸고(2px) 그림자를 살짝 진하게 하고 1.5배로 커지는 방식으로만 강조해, 파란 면적이 늘어나지 않게 합니다(`NaverMap.tsx`/`MockMap.tsx`).
- 방문 순서대로 Polyline을 연결합니다(선 색상 `#4F7FFF`은 마커와 별개로 그대로 유지합니다).
- 지도 우측 상단의 확대/축소 +/- 버튼(UI)은 표시하지 않습니다(`zoomControl: false`). 마우스 휠, 드래그, 모바일 핀치 확대/축소는 네이버 지도 기본 동작으로 그대로 사용할 수 있습니다.
- 일정 카드를 클릭하면 해당 마커가 강조되고 지도 중심이 그 위치로 부드럽게 이동합니다(`panTo`).
- 장소가 추가/삭제/순서변경되어 목록 자체가 바뀐 경우:
  - 장소가 **1곳**이면 적당한 고정 줌(16)으로 중심만 이동합니다.
  - 장소가 **2곳 이상**이면 항상 `fitBounds`로 모든 장소가 한 화면에 보이도록 자동 확대/축소합니다(상하좌우 80px 여백). 특정 장소만 확대되고 다른 장소가 화면 밖으로 나가는 문제를 막기 위해 고정 줌은 1곳일 때만 사용합니다.
  - `fitBounds` 결과 줌이 지나치게 크거나(장소들이 너무 가까움) 작아지면(너무 멀리 퍼짐) 10~17 범위로 보정합니다.
- 마커를 클릭하면 해당 일정 카드가 선택됩니다. **이미 선택된 마커를 다시 누르면 선택이 해제**되고, **다른 마커를 누르면 기존 선택은 해제되고 새 마커가 선택**됩니다. **지도의 빈 영역을 누르면 선택이 해제**됩니다(마커 클릭은 별도 리스너라 빈 영역 클릭으로 전파되지 않습니다). 선택 해제 시 마커는 원래 크기로, 카드 강조와 메모 펼침도 함께 접힙니다. 네이버 지도/Mock Map 모두 동일하게 동작합니다.
- 순서가 바뀌면 마커 번호와 Polyline 순서도 즉시 갱신됩니다.

## 장소 추가 시 시간순 자동 배치

방문 시간을 입력하면 그 시간에 맞는 자리에 자동으로 끼워 넣습니다(`src/lib/scheduleOrder.ts`의 `insertPlaceByTime`, `OutingScreen.tsx`의 `handleAddPlace`/`handleEditPlace`에서 사용).

- **추가할 때**: 시간이 있으면 기존 카드들 중 "이 장소보다 시간이 늦은 첫 카드" 바로 앞에 삽입됩니다. 시간이 없는 카드는 항상 "더 늦은" 것으로 취급하므로, 시간이 있는 카드는 시간이 없는 카드들보다 항상 위에 옵니다. 시간이 아예 없으면 기존처럼 맨 뒤에 추가됩니다.
- **같은 시간이거나 시간이 없는 카드끼리**는 순서를 건드리지 않습니다 — 새로 추가되는 카드는 같은 시간의 기존 카드들 *뒤에* 붙어서, 먼저 추가한 순서가 유지됩니다.
- **전체를 다시 정렬하는 게 아니라 "끼워 넣기"입니다.** 이미 드래그로 순서를 바꿔둔 카드들은 절대 건드리지 않습니다 — 새 카드 하나만 적절한 위치를 찾아 들어갈 뿐입니다. 그래서 드래그로 정해둔 순서가 이후 장소 추가로 인해 초기화되지 않습니다.
- **수정할 때도 시간이 바뀌면** 같은 방식으로 원래 자리에서 빼서 새 시간 기준으로 다시 끼워 넣습니다. 시간이 안 바뀌었으면(이름/메모/위치만 수정) 자리를 그대로 두어, 같은 시간의 다른 카드와의 순서가 괜히 바뀌지 않게 합니다.
- 이렇게 자리가 정해진 뒤에도 **드래그로 순서를 자유롭게 다시 바꿀 수 있고**, 그 순서가 그대로 유지됩니다(이 배치 로직은 추가/수정 시에만 실행되고, 드래그 결과를 다시 정렬하지 않습니다).
- 순서가 바뀌면 항상 그렇듯 지도 마커 번호와 Polyline도 함께 갱신됩니다(`places` 배열 순서를 그대로 따라가는 기존 로직 그대로).

## 일정 카드 조작

- **순번(①②③) 클릭**: "지도에서 보기" / "네이버지도에서 길찾기" 액션 시트가 뜹니다. 순번 마커는 지도 위 번호 마커와 같은 디자인 시스템(흰 배경 + 브랜드 블루 테두리·숫자)을 사용합니다. 평소엔 얇은 테두리, 선택 시엔 테두리를 굵게(2px) + 그림자로만 강조합니다(`ScheduleCard.tsx`).
  - 지도에서 보기 → 해당 마커 강조 + 지도 중심 이동
  - 네이버지도에서 길찾기 → 저장된 좌표로 `https://map.naver.com/v5/search/{위도},{경도}`를 새 탭으로 엽니다. 사용자가 URL을 직접 입력할 필요가 없습니다(`src/lib/naver.ts`).
- **조작 영역 순서(위→아래)**: 수정(연필) → 위로 이동 → 아래로 이동 → 삭제.
- **수정 버튼(연필 아이콘)**: 누르면 해당 장소의 **수정 Bottom Sheet**가 열립니다(장소명/시간/메모/위치 수정 가능, 기존 값이 채워진 채로 열립니다). 예전에는 이 자리의 아이콘이 드래그 핸들을 겸했는데(점 6개 → 위/아래 화살표 아이콘 순으로 바뀌어왔습니다), 위/아래 화살표 모양이라 "순서 변경 버튼"으로 오해되기 쉬워 지금은 **드래그 기능 없이 수정 전용**(연필 아이콘)으로 분리했습니다.
- **드래그로 순서 변경**: 특정 핸들이 아니라 **카드 전체**가 드래그 대상입니다. 카드를 누른 채로 옮기면(모바일은 길게 눌러서 드래그) dnd-kit으로 순서가 바뀝니다. `MouseSensor`는 6px 이상 움직여야, `TouchSensor`는 150ms 이상 눌러야(5px 이내 흔들림 허용) 드래그로 인식하는 activation constraint 덕분에, 카드 안의 수정/이동/삭제 버튼을 짧게 탭하는 동작이나 목록을 스크롤하는 동작과 서로 간섭하지 않습니다(`ScheduleCard.tsx`의 `motion.div`에 `useSortable`의 `attributes`/`listeners`를 직접 연결).
  - `ScheduleList.tsx`의 센서 구성에 유의하세요: **`PointerSensor`와 `TouchSensor`를 함께 쓰면 안 됩니다.** 최신 브라우저는 터치에도 Pointer 이벤트를 함께 발생시켜서, 거리 기반인 `PointerSensor`와 지연 기반인 `TouchSensor`가 같은 터치를 동시에 잡으려고 경쟁하며 드래그 시작이 몇 초씩 늦어지거나 두 번 시도해야 하는 문제가 있었습니다(실제로 겪은 버그입니다). 터치는 `TouchSensor`에만 맡기고 마우스는 `MouseSensor`로 분리해 해결했습니다.
  - 드래그 시작/카드가 손가락을 따라오는 것/드래그 종료 시 다른 카드가 비켜주는 것 모두 즉시 반응하도록, `isDragging`일 때 카드가 살짝 확대되고(`scale: 1.03`) 그림자가 진해지며(`shadow-xl`), 이 애니메이션과 목록 재배치(`layout`) 애니메이션 모두 짧고(150ms) 스프링이 아닌 `easeOut` transition을 씁니다. 카드에는 `touch-manipulation`을 적용해 모바일 브라우저의 기본 더블탭 확대 감지 지연도 없앴습니다.
  - 놓는 즉시(`onDragEnd`) 새 순서가 `onReorder`로 반영되어 카드·지도 마커 번호·Polyline·LocalStorage가 함께 갱신됩니다.
  - **처음 써보는 사용자를 위한 안내 문구**: "일정 / 총 N곳" 헤더 바로 아래에, 헤더에 딸린 부가 설명처럼 "카드를 드래그하여 순서를 변경해보세요."라는 문구(11px, `#999` 연한 회색)가 뜹니다. 제목과는 `gap-0.5`로 가깝게 붙여 "헤더의 일부"로 읽히게 하고, 문구 자신에 `mb-1.5`(6px) 여백을 더 줘서 그 아래 첫 카드와는 확실히 떨어져 보이도록 했습니다 — 제목 → 안내 문구 → 카드 순으로 정보 계층이 자연스럽게 이어지고, 카드 사이의 "↓ 약 …km · 도보 약 …분" 이동 요약과도 레벨이 명확히 구분됩니다. 장소가 **2곳 이상**일 때만 보이고(1곳뿐이면 순서 개념이 없으니 표시 안 함), 사용자가 **드래그로 순서를 한 번이라도 바꾸면** `routie:hasReorderedSchedule` 값이 localStorage에 저장되어 그 뒤로는 다시 뜨지 않습니다(이미 쓸 줄 아는 사용자에게 계속 노출되는 걸 막기 위함). 기능 자체와는 무관한 안내용 텍스트라 클릭/동작에 영향을 주지 않습니다(`ScheduleList.tsx`).
    - **주의(배포 환경에서 안 보인다는 제보 관련)**: `routie:hasReorderedSchedule`는 **localStorage라 브라우저·도메인마다 따로 저장**됩니다. 배포 주소에서 이전에 한 번이라도 드래그해본 적이 있으면(테스트든 실사용이든) 그 브라우저에서는 이후 계속 안 보이는 게 정상 동작입니다 — 새 시크릿 창이나 다른 브라우저로 배포 주소에 접속해 장소를 2곳 이상 넣어보면 다시 보여야 합니다. `[Routie][Debug][ScheduleList]` 콘솔 로그가 매 렌더마다 `placesLength`/`hasReordered`/`isReorderedFlagLoaded`/`shouldShowDragHint`를 찍어주니, 배포 페이지 개발자 도구 콘솔에서 이 값을 직접 확인해 원인(플래그가 이미 true인지, 아니면 다른 문제인지)을 구분할 수 있습니다.
- **위/아래 화살표 버튼**: 드래그가 불편한 환경을 위한 보조 수단으로, 수정 버튼 바로 아래 별도 버튼으로 항상 제공됩니다.
- **삭제 버튼**: 카드 삭제, 지도 마커/동선도 즉시 반영됩니다.
- **카드 사이 이동 요약**: 각 카드 사이에 "↓ 약 1.2km · 도보 약 18분"처럼 다음 장소까지의 대략적인 거리/도보 시간을 표시합니다. 실제 길찾기 API가 아닌 두 좌표 간 직선거리(하버사인 공식)를 1km당 15분 기준으로 환산한 예상치이며, 순서가 바뀌면 즉시 다시 계산됩니다(`src/lib/distance.ts`).

## 장소 추가/수정 — 위치 선택 & 저장 장소

일반 사용자가 위도/경도를 직접 알 필요가 없도록, 장소 추가/수정 Bottom Sheet(`PlaceForm.tsx`)에서는 좌표 입력이 기본적으로 숨겨져 있습니다. 흐름은 이렇게 이어집니다.

1. 장소명 입력 — 또는 비워두고 다음 단계에서 자동으로 채워지게 둬도 됩니다
2. **"지도에서 위치 선택"** 버튼으로 위치 선택 화면(`LocationPicker`)을 엽니다
3. 화면 상단 검색창에 원하는 장소(카페, 음식점, 상호명, 지하철역) 또는 지역명을 입력해 검색하거나, 지도를 직접 탭/클릭해 위치를 고릅니다
4. **"이 위치로 선택"**을 누르면 폼으로 돌아와 좌표와 **장소명이 함께** 반영됩니다
5. 필요하면 장소명을 직접 수정하고 장소 추가 완료

- **장소명 자동 입력** (`LocationPicker.tsx`의 `suggestedName`, `PlaceForm.tsx`의 `handleConfirmLocation`): "이 위치로 선택"을 누르면 좌표뿐 아니라 장소명 입력칸도 함께 채워집니다. 항상 **제안일 뿐**이라 강제로 확정되지 않고, 장소명 필드는 그대로 수정 가능한 일반 입력칸입니다(안내 문구 "장소 이름은 자동으로 입력돼요. 필요하면 수정할 수 있어요."가 항상 표시됩니다).
  - **검색 결과(장소/POI)를 선택한 경우** — 그 결과의 이름을 그대로 씁니다(예: "스타벅스 응암역점", "올리브영"). 역지오코딩을 거치지 않아 빠르고 정확합니다.
  - **지도를 직접 탭하거나(마커 클릭 포함) 지역명 검색 fallback으로 좌표만 얻은 경우** — 이름이 없으므로 `app/api/reverse-geocode`(NCP Maps Reverse Geocoding, `NAVER_MAP_CLIENT_ID/SECRET` 재사용)로 그 좌표 주변 정보를 가져와 아래 우선순위로 이름을 만듭니다.
    1. 건물명/POI명이 있으면 그 이름
    2. 도로명 주소가 있으면 "{도로명 주소} 근처"
    3. 행정동만 있으면 "{행정동} 선택 위치"
    4. 아무 정보도 없으면 "선택한 위치"
  - 지도를 여러 번 연달아 탭해도 항상 **가장 최근 위치의** 역지오코딩 결과만 반영됩니다(이전 요청은 토큰으로 무시).
  - ⚠️ NCP Reverse Geocoding 응답의 정확한 필드 구조(`results[].land.addition0` 등)는 이 저장소에서 실행해 검증하지 못했습니다 — 콘솔의 `[Routie][reverse-geocode] 네이버 API 응답` 로그로 실제 응답 모양을 확인하고, 우선순위 로직(`app/api/reverse-geocode/route.ts`)이 여러분의 NCP 계정 응답과 맞는지 확인해주세요.
- **위치 선택은 필수입니다.** 위치를 고르지 않고 "추가하기"를 누르면 "위치를 선택해주세요" 오류가 뜨고 저장되지 않습니다. 예전에는 위치를 안 고르면 `defaultRegion`(지정 외출에서 검색해둔 지역) 또는 서울 좌표에 살짝 오프셋을 줘서 조용히 채워 넣었는데, 이게 실제 데이터 버그의 원인이었습니다 — 그렇게 채워진 좌표가 **진짜 장소처럼 `routie:outings`에 그대로 저장**되어 버려서, "오늘 외출"에 장소가 0개여야 정상 동작하는 현재 위치 자동 반영 로직이 통째로 건너뛰어지고, 지도가 그 "유령 장소"(예: 예전에 검색해뒀던 지역이나 서울시청 좌표)에 계속 고정되는 문제가 있었습니다. 이제는 이런 유령 좌표가 아예 만들어지지 않습니다. **이미 이런 식으로 위치 없이 추가된 장소나 즐겨찾기가 남아있다면(오늘 외출에 기억에 없는 장소가 있거나, 즐겨찾기 목록에 위치를 고른 적 없는 항목이 있다면) 직접 삭제해주세요** — 코드를 고쳐도 이미 저장된 유령 데이터까지 자동으로 지워지지는 않습니다.

- **위치 선택 화면(큰 지도)도 작은 지도와 완전히 같은 위치 결정 로직을 씁니다.** `LocationPicker.tsx`는 `OutingScreen.tsx`이 쓰는 것과 동일한 `NaverMap.tsx`를 그대로 재사용하고, `PlaceForm` → `LocationPicker`로 그 일정에 이미 저장된 다른 장소들(`existingPlaces`, 지금 수정 중인 장소 자신은 제외)과 `isToday`를 전달합니다.
  - **저장된 장소가 있으면** 그 장소들을 `Map`의 `places`로 그대로 넘겨서, 큰 지도도 그 장소들 기준으로 자동 bounds/줌이 맞춰집니다(`reason: "savedItinerary"`).
  - **오늘 외출이고 저장된 장소가 0개면** `useAutoLocate`로 현재 위치를 새로 조회해서 `currentLocationOnly`로 넘기고, 조회 중에는 (작은 지도와 동일하게) "현재 위치를 불러오는 중..." 오버레이로 지도를 가려서 예전 값이 잠깐도 보이지 않게 합니다(`reason: "currentLocation"`, 실패 시 `"defaultLocation"`).
  - **지정 외출(오늘이 아닌 날짜)이고 저장된 장소도 0개면** 기존처럼 `defaultRegion`(지정 외출에서 검색해둔 지역)을 씁니다(`reason: "savedRegion"`).
  - 예전에는 이 화면이 항상 `places={[]}`만 넘기고 `currentLocationOnly`도 아예 안 넘겨서, 작은 지도는 고쳐졌는데 **이 큰 지도 화면만 계속 예전 `defaultRegion` 값(대구 등)으로 열리는 문제**가 있었습니다. `[Routie][Debug][LocationPicker]` 로그로 이 화면이 어떤 근거로 중심을 잡았는지 확인할 수 있습니다.
- **위치 선택 화면 검색**: 화면 상단에 "원하는 장소를 입력하거나 지도에서 선택해주세요."라는 안내 문구가 항상 표시되어, 검색은 지도를 이동시키는 용도이고 최종 위치는 지도에서 직접 골라야 한다는 2단계 흐름을 명확히 안내합니다(검색창 placeholder도 동일). 입력 후 검색하면 **서로 다른 두 네이버 API를 순서대로** 호출합니다(`LocationPicker.tsx`) — 동시에 부르지 않고, 장소 검색을 먼저 시도한 뒤 결과가 없을 때만 지역명 검색으로 넘어갑니다.
  1. **장소(POI) 검색 먼저 시도** — `app/api/search-place`가 **네이버 검색 API(지역 검색, 개발자센터 https://developers.naver.com)**를 호출해 카페/음식점/역/상호명 같은 구체적인 장소를 최대 5건 찾습니다(엔드포인트 `https://openapi.naver.com/v1/search/local.json`, 헤더 `X-Naver-Client-Id`/`X-Naver-Client-Secret`, 자격증명 `NAVER_SEARCH_CLIENT_ID`/`SECRET`). "카페", "성수 카페", "강남역", "스타벅스", "올리브영"처럼 지역명만으로는 찾을 수 없는 검색에 씁니다. 결과가 있으면 이름/주소 목록을 검색창 아래에 보여주고, **이 시점엔 아직 좌표로 바꾸지 않습니다** — 이 API가 주는 `mapx`/`mapy`의 좌표계가 계정/버전에 따라 다르게 해석되어 신뢰할 수 없었기 때문입니다(실제로 "카페", "스타벅스" 검색이 반영되지 않는 문제의 원인이었습니다). 제목/카테고리에 붙어 오는 `<b>` 강조 태그는 서버에서 제거해서 내려줍니다.
  2. **목록에서 고르면 그때 지오코딩** — 사용자가 장소 하나를 탭하면, 그 장소의 주소를 `app/api/geocode`(NCP Maps Geocoding API, 헤더 `X-NCP-APIGW-API-KEY-ID`/`X-NCP-APIGW-API-KEY`, 자격증명 `NAVER_MAP_CLIENT_ID`/`SECRET`)에 다시 넣어 최종 좌표를 얻습니다. 좌표는 항상 이 경로로만 얻습니다.
  3. **장소 검색 결과가 없거나 실패하면 지역명 검색으로 자동 대체(fallback)** — 입력한 검색어를 그대로 `app/api/geocode`에 넣어 지도를 이동시킵니다("불광동", "대구"처럼 행정구역 단위 검색이 정상 동작하던 기존 경로 그대로입니다).
  - **중요**: 두 API는 완전히 다른 시스템이자 다른 자격 증명입니다. `NAVER_MAP_CLIENT_ID/SECRET`(NCP 콘솔, Maps 전용)을 `NAVER_SEARCH_CLIENT_ID/SECRET`(네이버 개발자센터, 검색 전용) 자리에 넣으면 401 인증 실패가 납니다. 두 값 모두 각 API Route(서버)에서만 쓰고 `NEXT_PUBLIC_` 접두사가 없어 브라우저에 노출되지 않습니다(`.env.local.example` 참고).
  - 어느 경로로 찾았든 지도가 그 위치로 이동하며 임시 마커가 표시될 뿐, 아직 확정된 건 아닙니다 — 기존과 동일하게 지도에서 직접 위치를 더 조정하거나 바로 **"이 위치로 선택"**을 눌러야 폼에 반영됩니다.
  - 검색/지오코딩이 모두 실패/결과 없음이면 "검색 결과를 찾을 수 없어요. 지도에서 직접 위치를 선택해주세요."로 안내하고, 지도 직접 선택 기능은 그대로 사용할 수 있습니다. 각 라우트는 `[Routie][geocode]`/`[Routie][search-place]` 로그로 요청 URL, 환경변수 설정 여부(마스킹됨), 네이버 API의 실제 status/body를 출력하니 원인 파악에 활용하세요.
- 네이버 지도 API가 연결되어 있으면 실제 지도를 탭/클릭해 위치를 고를 수 있습니다. 좌표는 오직 `naver.maps.Event`의 `click` 이벤트가 그 시점에 직접 계산해주는 `e.coord`만 사용합니다(`NaverMap.tsx`). 예전에는 이 이벤트가 혹시 안 붙는 경우를 대비해 DOM `onClick` + `getProjection().fromOffsetToCoord()` fallback을 함께 두었는데, 두 계산이 매 클릭마다 동시에 실행되며 서로 다른 좌표(특히 검색 직후처럼 방금 `setCenter`/`setZoom`한 시점에는 fallback 쪽 projection이 최신 상태를 반영 못 할 수 있음)를 내놓아 나중에 실행되는 쪽이 정확한 좌표를 덮어써버리는 문제가 있었습니다. 지금은 그 fallback을 제거해 좌표가 항상 실제로 클릭한 지점과 정확히 일치합니다.
  - API가 없어 Mock Map인 경우에도 화면을 클릭하면 클릭 위치를 기준으로 좌표를 계산해 위치 선택을 완료할 수 있습니다 (앱이 깨지지 않습니다). Mock Map은 실제 지도가 아니라 좌표를 정규화한 평면이라, 마커 배치·클릭→좌표 변환·임시 핀 렌더링이 모두 **같은 좌표 범위**(현재 장소들 + 검색/클릭으로 고른 위치를 모두 포함하도록 매번 다시 계산됨, `src/lib/mockGeo.ts`)를 기준으로 동작합니다. 그렇지 않으면 서울 권역을 벗어난 지역(거제, 대구 등)을 검색했을 때 그 지점이 화면 가장자리로 잘리거나 클릭해도 전혀 다른 곳의 좌표로 환산되는 문제가 있었습니다. 다만 검색 자체는 Geocoding 서버 자격 증명이 필요해 Mock Map 여부와 무관하게 별도로 동작합니다.
- 하단의 **"이 위치로 선택"** / **"취소"** 버튼으로 확정하거나 되돌아갑니다.
- 확정하면 폼으로 돌아와 위도/경도 대신 **"위치 선택 완료"** 문구만 표시됩니다. 이미 위치가 선택된 상태(수정 모드 포함)에서는 버튼 문구가 **"지도에서 위치 다시 선택"**으로 바뀝니다.
- 좌표를 직접 다루고 싶다면 **"좌표 직접 입력 (개발자용)"** 접기 영역을 펼치면 됩니다. 이 영역은 개발 중 지도 선택 흐름을 디버깅하기 위한 도구라 **`NODE_ENV === "production"`(배포 빌드)에서는 아예 렌더링되지 않습니다**(`PlaceForm.tsx`의 `showDevCoordsInput`). 입력창/버튼/안내 문구가 통째로 숨겨질 뿐 `lat`/`lng` state 자체는 그대로 있고 계속 `LocationPicker`가 채워주므로, 지도 선택·장소 검색·역지오코딩 등 다른 흐름에는 영향이 없습니다. 로컬에서 `npm run dev`로 띄우면(개발 모드) 지금처럼 계속 보입니다.
- `LocationPicker`는 메인 화면과 동일한 `Map`/`NaverMap` 컴포넌트를 "위치 선택 모드"(`isPickingLocation`/`pickedLocation`/`onPickLocation`/`focusRequest` props)로 재사용합니다. 지도가 전체 화면을 채우고, 검색창·닫기 버튼·하단 버튼은 그 위에 오버레이로 얹히되 실제 눌러야 하는 요소만 `pointer-events-auto`를 적용해 지도 클릭을 가리지 않습니다.
- 지도 클릭 좌표는 `naver.maps.Event.addListener(mapInstance, "click", ...)`의 `e.coord.lat()/lng()`만 사용합니다(DOM `onClick` fallback은 이중 계산으로 인한 좌표 불일치 문제가 있어 제거했습니다 — 위 항목 참고). 검색 결과로 지도를 강제 이동시킬 때는 같은 좌표라도 다시 이동할 수 있도록 `FocusRequest`에 매번 새 `token`을 담아 전달합니다.
- `LocationPicker`는 raw `createPortal`이 아니라 **자체 Radix `Dialog.Root`/`Dialog.Portal`/`Dialog.Content`**로 구현되어 있습니다. 상위 PlaceForm의 Bottom Sheet도 Radix Dialog이기 때문에, 이렇게 해야 Radix가 두 Dialog를 "중첩된 레이어"로 인식해서 포커스 트랩과 바깥 클릭 감지를 항상 가장 위(나중에 열린) 레이어 기준으로 올바르게 처리해 줍니다.
  - 이전에는 raw portal + Sheet의 `modal` prop을 동적으로 토글하는 방식으로 포커스 트랩 문제를 우회하려 했으나, Radix는 `modal` 값에 따라 내부적으로 다른 컴포넌트를 렌더링하기 때문에 이미 열려 있는 Sheet의 `modal`을 바꾸면 그 자식 트리 전체(PlaceForm, LocationPicker 포함)가 통째로 언마운트/재마운트되는 회귀 버그가 있었습니다. 지금은 `ui/sheet.tsx`에서 `modal`을 건드리지 않습니다.
  - 그래도 만약을 대비해 두 가지 방어선을 남겨뒀습니다: `ui/sheet.tsx`의 `Dialog.Content`에 `onPointerDownOutside`/`onInteractOutside` 예외 처리(`data-routie-overlay` 마커 감지), 그리고 `src/lib/locationPickerGuard.ts`의 전역 카운터 가드(LocationPicker가 열려 있는 동안 Sheet의 `onOpenChange(false)` 요청을 무시).
- 디버깅용 `console.log`가 남아 있습니다: `"map click listener registered"`, `"map clicked", lat, lng`, `"[Routie] ..."` 로그로 각 단계가 실제로 실행되는지 브라우저 콘솔에서 확인할 수 있습니다.
- **"즐겨찾기 장소로 저장"** 체크박스를 켜고 저장하면, 현재 입력한 장소가 카테고리와 함께 즐겨찾기 목록(`routie:favorites`)에도 함께 저장됩니다.
  - 카테고리는 `CategoryPicker`에서 칩(chip)으로 고릅니다. 기본 카테고리(카페/병원/음식점/전시·문화/쇼핑/기타)는 `routie:categories`에 저장되고, `+` 버튼으로 직접 추가한 카테고리도 같은 곳에 저장되어 새로고침해도 유지됩니다.
  - 칩 오른쪽의 `X`로 기본/사용자 추가 카테고리 모두 삭제할 수 있습니다. 삭제 전 인라인 확인 문구가 뜨고, 삭제하면 그 카테고리를 쓰던 기존 즐겨찾기는 **삭제되지 않고 "기타"로 자동 변경**됩니다(`src/hooks/useCategories.ts`).
- **"저장한 장소 불러오기"** 버튼(장소 추가 시트 상단)을 누르면 저장된 즐겨찾기 목록이 뜨고, 하나를 선택하면 이름/좌표/메모를 다시 입력할 필요 없이 현재 일정에 바로 추가됩니다. 이때 즐겨찾기의 id를 그대로 쓰지 않고 일정 전용 id를 새로 생성하므로, 같은 즐겨찾기를 여러 날짜/여러 번 추가할 수 있습니다.

## 자동 저장

- 로그인/서버 없이 **LocalStorage에만** 저장됩니다. 장소 추가/수정/삭제/순서 변경/메모/일정 제목은 물론, `useLocalStorage`를 쓰는 모든 데이터(오늘·지정 외출의 장소 목록, 즐겨찾기, 카테고리, 기본 지역)가 값이 바뀔 때마다 즉시 저장됩니다(`src/hooks/useLocalStorage.ts`). 별도의 "저장" 버튼은 없습니다 — 앱을 끄거나 새로고침해도 브라우저의 사이트 데이터를 지우지 않는 한 그대로 남아 있습니다.
- 외출 화면(오늘/지정 외출) 오른쪽 하단에 **"마지막 저장: N분 전"** 같은 작은 회색 문구가 뜹니다(`SaveStatusIndicator.tsx`). FAB(➕)와 같은 높이·같은 하단 여백(`max(1.5rem, safe-area)`)에 두되, FAB 왼쪽으로 0.75rem 떨어뜨려 겹치지 않게 배치했습니다. `useLocalStorage`가 실제로 `localStorage.setItem`을 호출할 때마다 `src/lib/saveStatus.ts`의 전역 저장소에 시각이 기록되고, 이 컴포넌트가 그 값을 구독해 상대 시간으로 보여줍니다(`src/lib/time.ts`의 `formatRelativeTime`: 방금 전 → N분 전 → N시간 전 → 어제 → N일 전 → 날짜, 30초마다 갱신). 저장이 아직 한 번도 없었다면 표시되지 않고, 처음 나타날 때는 페이드인으로 자연스럽게 등장합니다. 클릭 동작이 없는 안내 문구라 `pointer-events-none`으로 두어 아래 카드 터치를 가리지 않습니다.

## 홈 화면 — 최근 작성한 일정

- 홈 화면 하단에 **"최근 작성한 일정"** 섹션이 있습니다(`src/app/page.tsx`, `RecentOutingCard.tsx`). 장소가 1곳 이상 있는 일정만, **마지막 저장이 최신인 순서**로 카드 목록을 보여줍니다(`useRecentOutings`, `src/hooks/useOutings.ts`).
- 각 카드는 **일정 제목 + "마지막 저장: N분 전" + 장소 수**를 보여주고, 카드 본문(아이콘+텍스트 영역)을 누르면 해당 날짜의 외출 화면(`/outing/{date}`)으로 바로 이동해 이어서 편집할 수 있습니다. 홈 화면 상단의 기존 메뉴 카드(오늘 외출/지정 외출/즐겨찾기 장소)와 같은 카드 톤(테두리 + `bg-card` + `shadow-sm`, 원형 아이콘)을 그대로 씁니다.
- **일정 제목**: 일정에는 이제 선택적인 제목이 있습니다. 외출 화면 상단 날짜 옆의 연필 아이콘을 누르면 이름을 정할 수 있고(`OutingHeader.tsx`), 비워두면 제목 대신 날짜(예: "7월 8일 (수) 외출")가 표시됩니다. 홈 화면 카드의 제목도 이 값을 그대로 씁니다.
- **오늘 외출 → 지정 외출 바로가기**: "오늘 외출" 화면(`isToday`)에서만 헤더 오른쪽 끝에 달력(Outline) 아이콘이 뜨고, 누르면 `/calendar`(지정 외출 화면)로 이동합니다(`OutingHeader.tsx`). 아이콘 자체는 다른 헤더 아이콘과 같은 크기(`h-5 w-5`)를 쓰지만, 버튼(터치 영역)은 모바일에서 누르기 쉽도록 `h-10 w-10`(40px)로 다른 아이콘 버튼들보다 넉넉하게 잡았습니다. `router.push`로 이동하므로 뒤로 가기를 누르면 다시 이 오늘 외출 화면으로 돌아옵니다. 오늘이 아닌 날짜의 외출 화면에서는 이미 "지정 외출" 흐름 안에 있으므로 이 아이콘 대신 같은 너비의 빈 자리만 유지해 헤더 레이아웃이 그대로 균형을 이룹니다.
- **카드 오른쪽 위 더보기(⋮) 메뉴**: 카드 본문과 별개의 버튼이라 눌러도 이동하지 않습니다(`RecentOutingCard.tsx`). 누르면 기존 "지도에서 보기/네이버지도에서 길찾기" 액션 시트와 같은 형태의 Bottom Sheet가 뜨고, 세 가지를 고를 수 있습니다(`src/app/page.tsx`).
  1. **이어서 작성** — 카드 본문을 누른 것과 동일하게 `/outing/{date}`로 이동합니다.
  2. **일정 복제** — 장소 목록(각 장소는 새 id로 재발급)과 제목("원본 제목 (복사본)")을 그대로 복사해 **가장 가까운 빈 날짜**(내일부터 순서대로, 이미 장소가 있는 날짜는 건너뜀)에 새 일정으로 저장합니다(`duplicateOuting`, `useOutings.ts`). 일정은 날짜당 하나만 존재할 수 있는 구조라 복제본도 반드시 어떤 날짜엔가는 있어야 하기 때문입니다. 복제 직후 "OO 일정을 복제했어요" 토스트가 뜨고, 복제본은 방금 저장되었으므로 목록 맨 위에 나타납니다.
  3. **일정 삭제** — 바로 지우지 않고 확인 Bottom Sheet("정말 이 일정을 삭제하시겠습니까?" / "삭제된 일정은 복구할 수 없습니다." / 취소·삭제 버튼)를 먼저 띄웁니다. **삭제**를 눌러야 실제로 지워지고(`deleteOuting`), 지운 뒤에는 복구할 방법이 없습니다.
- 작성한 일정이 하나도 없으면 카드 목록 대신 **"아직 작성한 일정이 없습니다."** 안내와 **"새 일정 만들기"** 버튼(오늘 외출로 이동)을 보여줍니다.
- 일정 데이터 구조가 `Place[]`(장소 배열만)에서 `{ title, places, updatedAt }`(제목/장소/마지막 저장 시각)로 바뀌었습니다. 이전 버전에서 이미 저장해둔 데이터(배열 형태)를 읽을 때는 제목 없음·저장시각 0으로 자동 변환해서 기존 일정을 잃지 않습니다(`useOutings.ts`의 `normalizeEntry`).

## 데이터 구조 (날짜별 저장)

```ts
type Place = {
  id: string;
  name: string;
  time?: string;
  memo?: string;
  lat: number;
  lng: number;
};

// LocalStorage key: "routie:outings"
type OutingEntry = {
  title: string | null; // null이면 홈/헤더에 날짜 기반 기본 제목을 표시
  places: Place[];
  updatedAt: number; // 마지막 저장 시각(ms) — "최근 작성한 일정" 정렬/"마지막 저장" 문구에 사용
};
type OutingMap = Record<string, OutingEntry>; // { "2026-07-07": OutingEntry, "2026-07-12": OutingEntry }

type FavoritePlace = {
  id: string;
  name: string;
  category?: string;
  memo?: string;
  lat: number;
  lng: number;
};

// LocalStorage key: "routie:favorites"
```

`src/hooks/useOutings.ts`가 날짜별 일정 구조를, `src/hooks/useFavorites.ts`가 즐겨찾기 배열을 감쌉니다.

- `useOutingsMap()` — 날짜별 일정 전체 맵이 필요할 때 (달력 화면에서 일정 있는 날짜 표시 등)
- `useOuting(date)` — 특정 날짜의 `places`/`setPlaces`만 다룰 때 (오늘/지정 외출 화면). 오늘 날짜에 처음 진입하면 예시 데이터를 한 번 시딩합니다.

"오늘 외출"은 오늘 날짜 key를, "지정 외출"은 달력에서 선택한 날짜 key를 그대로 사용하므로 같은 화면 컴포넌트(`OutingScreen`)를 재사용할 수 있습니다.

## 지정 외출(달력) 기능

- `/calendar`에서 월 단위 달력을 보여주고, 일정이 있는 날짜는 점(●) 표시로 구분합니다.
- 날짜를 선택하면 하단에 해당 날짜의 일정 요약(또는 "예정된 외출이 없어요")이 표시됩니다.
- "+ 새 외출 만들기"(또는 일정이 있으면 "일정 보기") 버튼을 누르면 `/outing/[선택한 날짜]`로 이동합니다.
- 그 화면에서 장소를 추가하면 선택한 날짜의 일정으로 저장되며, 달력으로 돌아가 같은 날짜를 다시 선택하면 저장된 일정이 그대로 보입니다.
- **연도 바로 이동**: 달력 상단의 "OOOO년 O월" 텍스트를 누르면 연도 선택 Bottom Sheet가 뜹니다(`Calendar.tsx`). 월을 여러 번 넘기지 않고도 먼 과거/미래 연도로 바로 이동할 수 있게 하기 위함입니다.
  - 목록 범위는 **현재 보고 있는 연도와 오늘 연도 중 더 먼 쪽을 기준으로 앞뒤 20년씩**(`YEAR_PICKER_PADDING`) — 이미 몇 년 전/후를 보고 있는 상태에서 다시 열어도 그 연도가 항상 목록 안에 있습니다.
  - **현재 보고 있는 연도**는 채워진 파란 배경(선택 표시)으로, **오늘이 속한 연도**는 테두리만 있는 파란 원(day 그리드의 "오늘" 표시와 같은 스타일)으로 구분됩니다.
  - 시트가 열리면 현재 보고 있는 연도가 화면 중앙에 오도록 자동 스크롤됩니다(`scrollIntoView`).
  - 연도를 고르면 **보고 있던 월은 그대로 두고 연도만 바뀐 채** 즉시 달력이 갱신되고 시트가 닫힙니다(`calendar/page.tsx`의 `handleSelectYear`는 `viewYear`만 바꿉니다). 이전/다음 달 이동과 날짜 선택 흐름은 그대로입니다.

## 즐겨찾기 장소

- `/favorites`는 `routie:favorites`에 저장된 실제 데이터를 보여줍니다. 최초 진입 시 예시 데이터(온실카페·리움미술관·한강뷰 레스토랑)로 한 번 시딩되고, 이후에는 사용자가 저장/삭제한 내용이 그대로 유지됩니다.
- 각 카드에는 세 가지 버튼이 있습니다.
  - **오늘 외출에 추가** → 오늘 날짜 일정에 바로 추가
  - **날짜 선택 후 추가** → 작은 Bottom Sheet에서 날짜(`<input type="date">`)를 고르면 그 날짜 일정에 추가
  - **삭제(휴지통 아이콘)** → 즐겨찾기 목록에서 제거
- 추가할 때마다 하단에 확인 토스트가 잠깐 표시됩니다.
- 즐겨찾기 자체를 수정하는 기능은 MVP 범위를 넘어서 제외했습니다 (삭제 후 다시 저장하는 방식으로 대체).

## 폴더 구조

```
src/
  app/
    page.tsx                 # 홈 화면
    today/page.tsx           # 오늘 날짜로 리다이렉트
    outing/[date]/page.tsx   # 오늘/지정 외출 공통 화면
    calendar/page.tsx        # 지정 외출 달력
    favorites/page.tsx       # 즐겨찾기 장소
    api/geocode/route.ts     # NCP Maps Geocoding 서버 프록시 — 지역명/주소 (Client Secret 보호)
    api/search-place/route.ts # 네이버 검색 API(지역 검색) 서버 프록시 — 카페/음식점/역/상호명 등 POI의 이름/주소만 반환(좌표는 안 줌), Client Secret 보호
    api/reverse-geocode/route.ts # NCP Maps Reverse Geocoding 서버 프록시 — 좌표→건물명/도로명/행정동 기반 장소명 제안, Client Secret 보호
    layout.tsx, globals.css
  components/
    ui/                   # shadcn/ui 패턴 프리미티브 (Button, Input, Textarea, Label, Sheet, Checkbox)
    Map/                  # NaverMap / MockMap 자동 전환 + 로딩 상태
    LocationPicker.tsx    # 전체 화면 위치 선택 오버레이 (body 포탈)
    LocationPicker/       # NaverLocationPickerMap / MockLocationPickerMap
    Header.tsx            # 홈 화면 상단 로고/슬로건
    RegionSetup.tsx       # 최초 진입 시 조용한 위치 권한 감지(화면 없음), 루트 레이아웃에 마운트
    NaverMapsPreloader.tsx # 앱 진입 시 네이버 지도 SDK 스크립트를 미리 로드(화면 없음), 루트 레이아웃에 마운트
    OutingHeader.tsx      # 오늘/지정 외출 화면 상단 바 (뒤로가기 + 날짜 이동 + 오늘 뱃지 + 오늘 화면 전용 지정 외출 바로가기)
    OutingScreen.tsx      # 지도 + 일정 리스트 + 추가/수정/액션시트 조립
    Calendar.tsx          # 월간 달력 그리드 (상단 연도 클릭 시 연도 선택 Bottom Sheet)
    HomeMenuCard.tsx      # 홈 화면 메뉴 카드
    RecentOutingCard.tsx  # 홈 화면 "최근 작성한 일정" 카드 (제목 + 마지막 저장 + 장소 수 + 더보기 버튼)
    ScheduleList.tsx      # DndContext 기반 일정 리스트 + 이동 요약 삽입
    ScheduleCard.tsx      # 드래그/수정/순번 액션/위아래 버튼 포함 카드
    TravelConnector.tsx   # 카드 사이 거리·예상 도보 시간 표시
    PlaceForm.tsx         # 장소 추가/수정 공용 폼 (위치 선택, 즐겨찾기 저장 포함)
    SavedPlacesPicker.tsx # 저장한 장소 불러오기 Bottom Sheet
    BottomSheet.tsx, FloatingButton.tsx, EmptyState.tsx, PwaRegister.tsx
    SaveStatusIndicator.tsx # 외출 화면 하단의 "마지막 저장: N분 전" 자동 저장 상태 문구
  hooks/
    useLocalStorage.ts     # LocalStorage 동기화 훅. 같은 key의 다른 인스턴스에 변경을 pub/sub으로 브로드캐스트(교차 컴포넌트 동기화), 쓸 때마다 saveStatus.ts에 저장 시각도 기록
    useOutings.ts          # 날짜별 일정(제목/장소/저장시각) 저장·조회 + 최근 일정 목록/복제/삭제(useRecentOutings) 훅
    useFavorites.ts        # 즐겨찾기 저장/조회 훅
    useNaverMapsLoader.ts  # 네이버 지도 SDK 스크립트 로더 (NaverMap/LocationPicker 공용)
    useAutoLocate.ts       # 오늘 외출(장소 0개)용 현재 위치 조회 훅. currentLocation은 컴포넌트 state일 뿐 routie:defaultRegion을 읽거나 쓰지 않음(지정 외출과 상태 분리)
  types/
    place.ts, favorite.ts, global.d.ts (window.naver 타입)
  lib/
    utils.ts (cn), order.ts (①②③), id.ts, date.ts, naver.ts, distance.ts (거리/도보시간 추정), mockGeo.ts (Mock 위치 선택 좌표 변환)
    scheduleOrder.ts (insertPlaceByTime — 방문 시간 기준으로 장소를 적절한 위치에 끼워 넣기, 드래그 순서는 건드리지 않음)
    saveStatus.ts (마지막 저장 시각 전역 pub/sub, SaveStatusIndicator가 구독)
    time.ts (formatRelativeTime — SaveStatusIndicator/RecentOutingCard 공용 상대 시간 포맷)
    geocode.ts (geocodeQuery — /api/geocode 지역명/주소→좌표, searchPlaces — /api/search-place 장소명→이름/주소만, reverseGeocodeQuery — /api/reverse-geocode 좌표→장소명 제안; LocationPicker가 셋 다 사용)
public/
  manifest.json, sw.js, icon.svg
```

## 확장 예정 기능

- **네이버 검색 API 연동**: `src/lib/naver.ts`의 `searchNaverPlace()`를 실제 API 호출로 교체하면 장소명 검색 자동완성으로 정확한 좌표를 받아올 수 있습니다.
- **즐겨찾기 수정**: 현재는 삭제와 일정 추가만 지원, 필요하면 수정 폼 추가
- **일정 공유 기능**, **다크 모드**(디자인 토큰이 CSS 변수 기반이라 `:root` 다크 변수만 추가하면 확장 가능)
- **실제 길찾기 기반 이동 시간**: 지금은 `src/lib/distance.ts`의 직선거리 추정치(도보 1km당 15분)를 사용합니다. 추후 네이버 길찾기 API를 연동하면 실제 도로/경로 기반 시간으로 교체할 수 있습니다.
- **Mock Map 위치 선택 정확도**: API 키가 없을 때는 고정된 서울 권역 근사 범위(`src/lib/mockGeo.ts`)로 좌표를 추정합니다. 실제 서비스 배포 시에는 네이버 지도 API 키 설정을 권장합니다.

## 코드 품질 참고사항

이 코드는 로컬에서 `npm install`, `npm run lint`, `npm run build`로 검증해 주세요. 특히 이번 변경에서 새로 추가된 동적 라우트(`app/outing/[date]`)와 dnd-kit `TouchSensor` 관련 타입 오류가 없는지 확인을 권장합니다.

## 배포 방법 (Vercel)

1. GitHub에 저장소를 push합니다.
2. [Vercel](https://vercel.com)에서 New Project로 저장소를 Import합니다.
3. Environment Variables에 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`를 등록합니다 (없어도 Mock Map으로 배포는 정상 동작).
4. 네이버클라우드플랫폼 Application 설정에 배포 도메인을 서비스 URL로 추가합니다.
5. Deploy 실행 시 자동으로 빌드/배포됩니다.

## 제외 범위 (MVP)

- 로그인/회원가입, 서버·데이터베이스 연동
- 장소 검색 API (현재는 이름/시간/메모를 직접 입력하고, 위치는 지도에서 선택하거나 좌표를 직접 입력)
- 사용자 위치 권한, 실제 길찾기 경로 계산, 최적 경로 추천
- 즐겨찾기 장소 수정 (삭제/추가만 지원)
