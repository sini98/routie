import { redirect } from "next/navigation";
import { getTodayDateString } from "@/lib/date";

// 매 요청마다 실제 오늘 날짜를 계산해야 하므로 정적 캐싱을 비활성화합니다.
export const dynamic = "force-dynamic";

export default function TodayRedirectPage() {
  redirect(`/outing/${getTodayDateString()}`);
}
