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

서울로 고정돼 있던 지도 기본 위치를 사용자별로 바꿀 수 있게 했습니다([RegionSetup.tsx](routie-app/src/components/RegionSetup.tsx), 루트 레이아웃에 마운트되어 앱 최초 진입 시 한 번만 동작).

- 위치 권한을 요청해 허용하면 현재 위치를 `routie:defaultRegion`에 저장합니다.
- 거부하거나 위치 API를 지원하지 않으면 지역 선택 Bottom Sheet(서울/대구/부산/거제/제주/광주/대전/인천)가 뜹니다. 아무것도 고르지 않고 닫아도 서울을 기본값으로 저장해 다음에 다시 묻지 않습니다.
- 이미 기본 지역이 저장되어 있으면 이 플로우는 건너뜁니다.
- 이 기본 지역은 **일정에 장소가 하나도 없을 때만** 지도/위치 선택 화면의 초기 중심으로 쓰입니다. 장소가 하나라도 있으면 항상 그 장소 좌표가 우선합니다(`src/hooks/useDefaultRegion.ts`).

## 화면 구성

```
/            홈 — 로고/슬로건 + 3개 메뉴 (오늘 외출 / 지정 외출 / 즐겨찾기 장소)
/today       오늘 날짜로 /outing/[오늘 날짜]로 리다이렉트
/outing/[date]  지도 + 일정 리스트 + 장소 추가 (오늘 외출, 지정 외출 공통 화면)
/calendar    지정 외출 — 월간 달력에서 날짜 선택 → 요약 확인 → 일정 화면 이동
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
- **위/아래 화살표 버튼**: 드래그가 불편한 환경을 위한 보조 수단으로, 수정 버튼 바로 아래 별도 버튼으로 항상 제공됩니다.
- **삭제 버튼**: 카드 삭제, 지도 마커/동선도 즉시 반영됩니다.
- **카드 사이 이동 요약**: 각 카드 사이에 "↓ 약 1.2km · 도보 약 18분"처럼 다음 장소까지의 대략적인 거리/도보 시간을 표시합니다. 실제 길찾기 API가 아닌 두 좌표 간 직선거리(하버사인 공식)를 1km당 15분 기준으로 환산한 예상치이며, 순서가 바뀌면 즉시 다시 계산됩니다(`src/lib/distance.ts`).

## 장소 추가/수정 — 위치 선택 & 저장 장소

일반 사용자가 위도/경도를 직접 알 필요가 없도록, 장소 추가/수정 Bottom Sheet(`PlaceForm.tsx`)에서는 좌표 입력이 기본적으로 숨겨져 있습니다. 흐름은 이렇게 이어집니다.

1. 장소명 입력
2. **"지도에서 위치 선택"** 버튼으로 위치 선택 화면(`LocationPicker`)을 엽니다
3. 화면 상단 검색창에 지역명을 입력해 검색하거나(시, 군, 구, 읍, 면, 동 단위 검색 가능), 지도를 직접 탭/클릭해 위치를 고릅니다
4. **"이 위치로 선택"**을 누르면 폼으로 돌아와 좌표가 반영됩니다
5. 장소 추가 완료

- **위치 선택 화면 검색**: 화면 상단에 "지역명(시·군·구·읍·면·동)을 검색한 후, 지도에서 원하는 위치를 선택하세요."라는 안내 문구가 항상 표시되어, 검색은 지역 단위로 지도를 이동시키는 용도이고 최종 위치는 지도에서 직접 골라야 한다는 2단계 흐름을 명확히 안내합니다. 검색창(`지역명을 검색하세요.`)에 입력 후 검색하면, 서버(`app/api/geocode`)가 네이버 Geocoding API(`https://maps.apigw.ntruss.com/map-geocode/v2/geocode`, 헤더 `X-NCP-APIGW-API-KEY-ID`/`X-NCP-APIGW-API-KEY`)로 좌표를 찾아 지도 중심을 그 위치로 이동시키고 임시 마커를 표시합니다. API 오류가 나도 지도 직접 선택 기능은 그대로 사용할 수 있습니다.
  - Geocoding은 서버 API Route에서만 처리합니다(`NAVER_MAP_CLIENT_SECRET`을 브라우저에 노출하지 않기 위해서입니다). 클라이언트는 `/api/geocode?query=...`만 호출합니다.
  - 서버는 실패 원인을 `reason` 코드로 구분해서 내려줍니다: `NO_RESULTS`(검색 자체는 성공했지만 결과 0건 → "검색 결과를 찾을 수 없어요"), `AUTH_FAILED`(네이버 API가 401/403 응답 → Client ID/Secret이 틀렸거나 해당 Application에서 Geocoding이 활성화되어 있지 않을 가능성이 높습니다), `MISSING_CONFIG`(서버에 `NAVER_MAP_CLIENT_ID`/`NAVER_MAP_CLIENT_SECRET`이 없음), `UPSTREAM_ERROR`/`NETWORK_ERROR`/`INVALID_RESPONSE`(그 외 통신/파싱 오류). "모든 검색어가 항상 실패"한다면 십중팔구 `AUTH_FAILED`이며, 서버 콘솔에 `[Routie][geocode]` 로그로 요청 URL, 환경변수 설정 여부(마스킹됨), 네이버 API의 실제 status/body가 그대로 출력되니 그걸로 원인을 확인할 수 있습니다. NCP 콘솔에서 해당 Application에 **Geocoding** API가 체크되어 있는지, Client ID/Secret이 그 Application 것이 맞는지 확인해보세요.
  - 검색으로 찾은 위치든 지도를 직접 눌러 찍은 위치든, 동일하게 임시 마커로 표시되고 "이 위치로 선택"을 눌러야 최종 반영됩니다.
- 네이버 지도 API가 연결되어 있으면 실제 지도를 탭/클릭해 위치를 고를 수 있습니다. 좌표는 오직 `naver.maps.Event`의 `click` 이벤트가 그 시점에 직접 계산해주는 `e.coord`만 사용합니다(`NaverMap.tsx`). 예전에는 이 이벤트가 혹시 안 붙는 경우를 대비해 DOM `onClick` + `getProjection().fromOffsetToCoord()` fallback을 함께 두었는데, 두 계산이 매 클릭마다 동시에 실행되며 서로 다른 좌표(특히 검색 직후처럼 방금 `setCenter`/`setZoom`한 시점에는 fallback 쪽 projection이 최신 상태를 반영 못 할 수 있음)를 내놓아 나중에 실행되는 쪽이 정확한 좌표를 덮어써버리는 문제가 있었습니다. 지금은 그 fallback을 제거해 좌표가 항상 실제로 클릭한 지점과 정확히 일치합니다.
  - API가 없어 Mock Map인 경우에도 화면을 클릭하면 클릭 위치를 기준으로 좌표를 계산해 위치 선택을 완료할 수 있습니다 (앱이 깨지지 않습니다). Mock Map은 실제 지도가 아니라 좌표를 정규화한 평면이라, 마커 배치·클릭→좌표 변환·임시 핀 렌더링이 모두 **같은 좌표 범위**(현재 장소들 + 검색/클릭으로 고른 위치를 모두 포함하도록 매번 다시 계산됨, `src/lib/mockGeo.ts`)를 기준으로 동작합니다. 그렇지 않으면 서울 권역을 벗어난 지역(거제, 대구 등)을 검색했을 때 그 지점이 화면 가장자리로 잘리거나 클릭해도 전혀 다른 곳의 좌표로 환산되는 문제가 있었습니다. 다만 검색 자체는 Geocoding 서버 자격 증명이 필요해 Mock Map 여부와 무관하게 별도로 동작합니다.
- 하단의 **"이 위치로 선택"** / **"취소"** 버튼으로 확정하거나 되돌아갑니다.
- 확정하면 폼으로 돌아와 위도/경도 대신 **"위치 선택 완료"** 문구만 표시됩니다. 이미 위치가 선택된 상태(수정 모드 포함)에서는 버튼 문구가 **"지도에서 위치 다시 선택"**으로 바뀝니다.
- 좌표를 직접 다루고 싶다면 **"좌표 직접 입력 (개발자용)"** 접기 영역을 펼치면 됩니다.
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
    api/geocode/route.ts     # 네이버 Geocoding 서버 프록시 (Client Secret 보호)
    layout.tsx, globals.css
  components/
    ui/                   # shadcn/ui 패턴 프리미티브 (Button, Input, Textarea, Label, Sheet, Checkbox)
    Map/                  # NaverMap / MockMap 자동 전환 + 로딩 상태
    LocationPicker.tsx    # 전체 화면 위치 선택 오버레이 (body 포탈)
    LocationPicker/       # NaverLocationPickerMap / MockLocationPickerMap
    Header.tsx            # 홈 화면 상단 로고/슬로건
    OutingHeader.tsx      # 오늘/지정 외출 화면 상단 바 (뒤로가기 + 날짜 이동 + 오늘 뱃지)
    OutingScreen.tsx      # 지도 + 일정 리스트 + 추가/수정/액션시트 조립
    Calendar.tsx          # 월간 달력 그리드
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
    useLocalStorage.ts     # LocalStorage 동기화 훅 (쓸 때마다 saveStatus.ts에 저장 시각 기록)
    useOutings.ts          # 날짜별 일정(제목/장소/저장시각) 저장·조회 + 최근 일정 목록/복제/삭제(useRecentOutings) 훅
    useFavorites.ts        # 즐겨찾기 저장/조회 훅
    useNaverMapsLoader.ts  # 네이버 지도 SDK 스크립트 로더 (NaverMap/LocationPicker 공용)
  types/
    place.ts, favorite.ts, global.d.ts (window.naver 타입)
  lib/
    utils.ts (cn), order.ts (①②③), id.ts, date.ts, naver.ts, distance.ts (거리/도보시간 추정), mockGeo.ts (Mock 위치 선택 좌표 변환)
    saveStatus.ts (마지막 저장 시각 전역 pub/sub, SaveStatusIndicator가 구독)
    time.ts (formatRelativeTime — SaveStatusIndicator/RecentOutingCard 공용 상대 시간 포맷)
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
