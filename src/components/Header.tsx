import type { CSSProperties } from "react";

type PinIconProps = { className?: string; style?: CSSProperties };

/**
 * 목적지 핀 아이콘. lucide-react의 MapPin은 얇은 outline(선) 스타일이라 작게 쓰면 존재감이
 * 약해서, 같은 실루엣(핀 몸통 + 안쪽 원)을 하나의 path로 합쳐 evenodd로 채웁니다 — 안쪽
 * 원 부분이 "구멍"처럼 뚫려 보이는 또렷한 실루엣 핀이 됩니다. 워드마크의 i 점과 슬로건
 * 아래 라인 양 끝, 두 군데에서 재사용해 같은 핀 모티프로 통일합니다.
 */
function PinIcon({ className, style }: PinIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0ZM15.3 10A3.3 3.3 0 1 0 8.7 10a3.3 3.3 0 0 0 6.6 0Z"
      />
    </svg>
  );
}

/**
 * "Routie" 워드마크의 i는 실제 마침표(dot) 대신 위치 핀 아이콘을 얹습니다. 폰트가 그리는
 * 점은 커스텀할 수 없어서, 점 없는 i(dotless i, "ı")로 글자를 그린 뒤 그 위에 핀 아이콘을
 * 절대 위치로 얹는 방식을 씁니다 — 나머지 글자(R/o/u/t/e)는 폰트 그대로, 전혀 손대지
 * 않습니다. 글자 색은 짙은 남색(`text-foreground`)이고, i의 핀만 브랜드 블루
 * (`text-primary`)로 남겨 목적지 포인트라는 의미를 도드라지게 합니다. 스크린 리더에는 이
 * 장식적 표기 대신 그냥 "Routie"로 읽히도록 sr-only 텍스트를 따로 둡니다.
 */
function Wordmark() {
  return (
    <h1
      className="relative text-5xl font-bold tracking-normal text-foreground"
      style={{ fontFamily: '"Trebuchet MS", "Segoe UI Rounded", "SF Pro Rounded", ui-rounded, Calibri, sans-serif' }}
    >
      <span aria-hidden="true" className="inline-flex items-baseline">
        <span>Rout</span>
        <span className="relative inline-block">
          <span>ı</span>
          <PinIcon className="absolute left-1/2 h-6 w-6 -translate-x-1/2 text-primary" style={{ top: "-0.22em" }} />
        </span>
        <span>e</span>
      </span>
      <span className="sr-only">Routie</span>
    </h1>
  );
}

/**
 * 슬로건 아래의 얇은 라인은 "출발과 목적지를 하나의 일정으로 연결한다"는 브랜드 의미를
 * 담은 장식 요소입니다. 양 끝 원 위에 워드마크와 같은 핀 아이콘을 얹어 "출발지 핀 —
 * 동선 — 목적지 핀"을 표현하되, 로고/슬로건보다 절대 눈에 띄면 안 되므로 핀·선·원 모두
 * 브랜드 메인 컬러보다 훨씬 연한 블루(#C7D3FF) 한 가지로만 그립니다. 경유지 점 같은 추가
 * 장식은 넣지 않습니다.
 */
function RouteLine() {
  return (
    <div className="relative -mt-2 h-6 w-[170px]" aria-hidden="true">
      <svg className="absolute inset-x-0 bottom-0" width="170" height="10" viewBox="0 0 170 10" fill="none">
        <line x1="9" y1="5" x2="161" y2="5" stroke="#C7D3FF" strokeWidth="2" strokeLinecap="round" />
        <circle cx="6" cy="5" r="3" fill="none" stroke="#C7D3FF" strokeWidth="1.5" />
        <circle cx="164" cy="5" r="3" fill="none" stroke="#C7D3FF" strokeWidth="1.5" />
      </svg>
      <PinIcon
        className="absolute h-4 w-4 -translate-x-1/2 text-[#C7D3FF]"
        style={{ left: "6px", bottom: "7px" }}
      />
      <PinIcon
        className="absolute h-4 w-4 translate-x-1/2 text-[#C7D3FF]"
        style={{ right: "6px", bottom: "7px" }}
      />
    </div>
  );
}

export default function Header() {
  return (
    <header
      className="flex flex-col items-center gap-1 px-5 pb-6 pt-10 text-center"
      style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}
    >
      <Wordmark />
      <p className="text-sm font-semibold text-primary">하루 일정을 더 쉽게</p>
      <RouteLine />
    </header>
  );
}
