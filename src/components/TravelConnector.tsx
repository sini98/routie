import { ArrowDown } from "lucide-react";
import { getTravelSummary } from "@/lib/distance";

type TravelConnectorProps = {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
};

/**
 * 두 장소 사이의 대략적인 이동 거리/시간을 보여줍니다.
 * 실제 길찾기 API가 아닌 직선거리 기반 추정치입니다.
 */
export default function TravelConnector({ from, to }: TravelConnectorProps) {
  return (
    <div className="flex items-center gap-1.5 pl-4 text-[11px] text-muted-foreground">
      <ArrowDown className="h-3 w-3 shrink-0" />
      <span>{getTravelSummary(from, to)}</span>
    </div>
  );
}
