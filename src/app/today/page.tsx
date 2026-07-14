import { redirect } from "next/navigation";
import { getTodayDateString } from "@/lib/date";

// 매 요청마다 실제 오늘 날짜를 계산해야 하므로 정적 캐싱을 비활성화합니다.
export const dynamic = "force-dynamic";

export default function TodayRedirectPage() {
  // from=today는 "오늘 외출 흐름에서 들어왔다"는 표시입니다 — 이후 하루 전/다음으로
  // 다른 날짜로 이동하거나 지정 외출(캘린더) 화면을 들렀다 돌아와도 이 표시가 유지되어야
  // 뒤로가기가 홈이 아니라 이 흐름으로 돌아올 수 있습니다(OutingHeader.tsx 참고).
  redirect(`/outing/${getTodayDateString()}?from=today`);
}
