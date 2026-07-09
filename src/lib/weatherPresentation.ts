/**
 * 기상청 초단기예보 카테고리 코드(SKY=하늘상태, PTY=강수형태, RN1=1시간 강수량(mm))를 아이콘
 * 이모지와 외출 코멘트 한 줄로 바꿉니다. 강수가 있으면(PTY!=="0") 하늘 상태보다 강수를
 * 우선해서 보여줍니다 — 비/눈이 오는데 "맑음" 아이콘이 뜨면 오히려 오해를 주기 때문입니다.
 *
 * RN1은 PTY가 "0"(강수없음)이라고 해도 보조 신호로 함께 확인합니다 — 강수 경계 시점에는
 * PTY와 RN1이 서로 살짝 어긋나는 경우가 있어(예: PTY는 아직 "0"인데 RN1은 이미 소량의
 * 강수량을 보여주는 경우), RN1에 실제 강수량(0보다 큰 값)이 잡히면 비가 오는 것으로
 * 취급합니다. RN1이 -99(격자 데이터 없음) 또는 0 이하이면 무시합니다.
 */
export function describeWeather(sky: string, pty: string, rn1?: number): { icon: string; comment: string } {
  const hasMeasurablePrecipitation = rn1 !== undefined && rn1 > 0;
  const effectivePty = pty !== "0" ? pty : hasMeasurablePrecipitation ? "1" : pty;

  switch (effectivePty) {
    case "1":
    case "4":
    case "5":
      return { icon: "🌧️", comment: "비가 와요. 우산을 챙기세요." };
    case "2":
    case "6":
      return { icon: "🌨️", comment: "비와 눈이 섞여 내려요. 우산을 챙기세요." };
    case "3":
    case "7":
      return { icon: "❄️", comment: "눈이 내려요. 미끄럼에 주의하세요." };
    default:
      break;
  }

  switch (sky) {
    case "1":
      return { icon: "☀️", comment: "외출하기 좋은 날이에요." };
    case "3":
      return { icon: "⛅", comment: "구름이 많지만 외출하기 괜찮아요." };
    case "4":
      return { icon: "☁️", comment: "흐린 날씨예요. 가벼운 겉옷을 챙기세요." };
    default:
      return { icon: "🌤️", comment: "오늘 날씨를 확인하고 외출해보세요." };
  }
}
