"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";
import { geocodeQuery } from "@/lib/geocode";

function describeSearchError(reason: string | undefined) {
  switch (reason) {
    case "NO_RESULTS":
      return "검색 결과를 찾을 수 없어요. 다른 지역명으로 검색해보세요.";
    case "AUTH_FAILED":
    case "MISSING_CONFIG":
      return "지역 검색을 사용할 수 없어요. 잠시 후 다시 시도해주세요.";
    default:
      return "검색 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.";
  }
}

type RegionSearchProps = {
  /** 검색 성공 후 이동할 경로 (예: 지정 외출에서는 `/outing/{선택한 날짜}`) */
  targetPath: string;
};

/**
 * 지역명(시·군·구·읍·면·동) 검색으로 기본 지역을 정하는 공용 입력창입니다. "사용자가 원하는
 * 지역이나 위치를 직접 선택"하는 지정 외출(달력) 화면과 장소 추가 화면(LocationPicker)에서만
 * 씁니다 — 홈 화면과 "현재 위치 기반으로 빠르게 시작하는" 오늘 외출에는 노출하지 않습니다.
 * 검색한 지역은 기본 지역(routie:defaultRegion)으로 저장되어, 아직 장소가 없는 일정의 지도
 * 초기 중심으로 쓰입니다.
 */
export default function RegionSearch({ targetPath }: RegionSearchProps) {
  const router = useRouter();
  const [, setDefaultRegion] = useDefaultRegion();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isSearching) return;

    setIsSearching(true);
    setErrorText(null);

    const result = await geocodeQuery(trimmed);
    setIsSearching(false);

    if (!result.ok) {
      setErrorText(describeSearchError(result.reason));
      return;
    }

    setDefaultRegion({ lat: result.lat, lng: result.lng });
    router.push(targetPath);
  };

  return (
    <div className="flex shrink-0 flex-col gap-1.5">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="지역명(시·군·구·읍·면·동)을 검색하세요."
          className="h-11 text-sm"
        />
        <Button
          type="submit"
          size="icon"
          className="h-11 w-11 shrink-0"
          disabled={isSearching || !query.trim()}
          aria-label="지역 검색"
        >
          <Search className="h-4 w-4" />
        </Button>
      </form>
      {errorText && <p className="px-1 text-xs text-destructive">{errorText}</p>}
    </div>
  );
}
