"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, ChevronDown, MapPin } from "lucide-react";
import { Place } from "@/types/place";
import { FavoritePlace } from "@/types/favorite";
import { generateId } from "@/lib/id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import LocationPicker from "@/components/LocationPicker";
import CategoryPicker from "@/components/CategoryPicker";
import { FALLBACK_CATEGORY } from "@/types/category";

type PlaceFormProps = {
  /** 값이 있으면 수정 모드, 없으면 추가 모드로 동작합니다. */
  initialValue?: Place;
  /** 이 일정에 이미 저장된 장소들. 위치 선택 화면(큰 지도)에서 bounds를 맞추는 기준으로 씁니다. */
  existingPlaces: Place[];
  /** 오늘 외출인지 여부 — 위치 선택 화면에서 "장소 0개일 때 현재 위치 우선" 판단에 씁니다. */
  isToday: boolean;
  onCancel: () => void;
  onSubmit: (place: Place) => void;
  onSaveAsFavorite?: (favorite: FavoritePlace) => void;
};

export default function PlaceForm({
  initialValue,
  existingPlaces,
  isToday,
  onCancel,
  onSubmit,
  onSaveAsFavorite,
}: PlaceFormProps) {
  const isEditing = Boolean(initialValue);

  const [name, setName] = useState(initialValue?.name ?? "");
  const [time, setTime] = useState(initialValue?.time ?? "");
  const [memo, setMemo] = useState(initialValue?.memo ?? "");
  const [lat, setLat] = useState(initialValue ? String(initialValue.lat) : "");
  const [lng, setLng] = useState(initialValue ? String(initialValue.lng) : "");
  const [error, setError] = useState("");

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);
  const [category, setCategory] = useState(FALLBACK_CATEGORY);

  const hasPickedLocation = lat.trim() !== "" && lng.trim() !== "";
  // 좌표 직접 입력 UI는 지도 선택 흐름을 디버깅할 때만 필요한 개발자용 도구라, 배포
  // 빌드(production)에서는 숨깁니다. lat/lng state 자체는 지도 선택(LocationPicker)이
  // 그대로 채우므로, 이 입력창을 숨겨도 위치 선택/검색/역지오코딩 흐름에는 영향이 없습니다.
  const showDevCoordsInput = process.env.NODE_ENV !== "production";

  const handleConfirmLocation = (coords: { lat: number; lng: number }, suggestedName: string | null) => {
    console.log("[Routie] PlaceForm에 위치 반영", coords, { suggestedName });
    setLat(String(coords.lat));
    setLng(String(coords.lng));
    // suggestedName은 검색 결과의 상호명이거나(예: "스타벅스 응암역점") 지도에서 직접 찍었을
    // 때의 역지오코딩 추천 이름입니다. 항상 제안일 뿐이니 사용자가 이후 자유롭게 수정할 수
    // 있고, 강제로 채우지 않아도 되는 값이라 없으면(null) 기존 입력을 그대로 둡니다.
    if (suggestedName) {
      setName(suggestedName);
    }
    setIsPickerOpen(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("장소명을 입력해주세요");
      return;
    }

    // 예전에는 위치를 선택하지 않으면 "기본 지역(defaultRegion) 또는 서울" 좌표에 살짝
    // 오프셋을 줘서 자동으로 채워 넣었습니다. 문제는 이렇게 채워진 좌표가 진짜 장소처럼
    // routie:outings에 그대로 저장된다는 점이었습니다 — 예를 들어 위치 선택 없이 "추가하기"만
    // 누르면, 그 시점의 defaultRegion(지정 외출에서 검색해둔 지역 등, 심지어 예전 테스트로
    // "대구"가 남아있었을 수도 있음)이나 서울 시청 좌표가 실제 저장된 장소 좌표가 되어버렸고,
    // 그러면 "오늘 외출"의 장소 개수가 0이 아니게 되면서 현재 위치 기반 시작 로직 전체가
    // 건너뛰어지고 지도가 그 "유령 장소" 위치로 고정되는 문제가 있었습니다. 지금은 위치
    // 선택을 필수로 만들어 이 문제를 원천 차단합니다 — 추측 좌표를 실제 저장 데이터인 것처럼
    // 취급하지 않습니다.
    if (!hasPickedLocation) {
      console.log("[Routie][Debug][PlaceForm] 위치 미선택으로 제출 차단");
      setError("위치를 선택해주세요");
      return;
    }

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      setError("위도/경도는 숫자로 입력해주세요");
      return;
    }

    const trimmedMemo = memo.trim() || undefined;

    if (saveAsFavorite) {
      onSaveAsFavorite?.({
        id: generateId(),
        name: trimmedName,
        category,
        memo: trimmedMemo,
        lat: parsedLat,
        lng: parsedLng,
      });
    }

    onSubmit({
      id: initialValue?.id ?? generateId(),
      name: trimmedName,
      time: time || undefined,
      memo: trimmedMemo,
      lat: parsedLat,
      lng: parsedLng,
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 overflow-y-auto">
        <div>
          <Label htmlFor="place-name">장소명 *</Label>
          <Input
            id="place-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="예: 강남역 스터디카페"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            장소 이름은 자동으로 입력돼요. 필요하면 수정할 수 있어요.
          </p>
        </div>

        <div>
          <Label htmlFor="place-time">방문 시간</Label>
          <Input id="place-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </div>

        <div>
          <Label htmlFor="place-memo">메모</Label>
          <Textarea
            id="place-memo"
            rows={2}
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="예: 대기 시간 보내기"
          />
        </div>

        <div>
          <Label>위치</Label>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              console.log("[Routie] 위치 선택 모드 진입 요청 (isSelectingLocation = true)");
              setIsPickerOpen(true);
            }}
          >
            <MapPin className="h-4 w-4" />
            {hasPickedLocation ? "지도에서 위치 다시 선택" : "지도에서 위치 선택"}
          </Button>
          {hasPickedLocation && (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
              위치 선택 완료
            </p>
          )}

          {showDevCoordsInput && (
            <details className="group mt-2 rounded-md border border-border p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
                좌표 직접 입력 (개발자용)
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="place-lat">위도</Label>
                  <Input
                    id="place-lat"
                    value={lat}
                    onChange={(event) => setLat(event.target.value)}
                    placeholder="예: 37.5665"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <Label htmlFor="place-lng">경도</Label>
                  <Input
                    id="place-lng"
                    value={lng}
                    onChange={(event) => setLng(event.target.value)}
                    placeholder="예: 126.9780"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                지도에서 위치를 선택하면 자동으로 채워져요. 정확한 좌표를 알고 있다면 여기 직접 입력해도 돼요.
              </p>
            </details>
          )}
        </div>

        <div className="rounded-md border border-border p-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="save-favorite"
              checked={saveAsFavorite}
              onChange={(event) => setSaveAsFavorite(event.target.checked)}
            />
            <Label htmlFor="save-favorite" className="mb-0 cursor-pointer">
              즐겨찾기 장소로 저장
            </Label>
          </div>

          {saveAsFavorite && (
            <div className="mt-3">
              <Label>카테고리</Label>
              <CategoryPicker value={category} onChange={setCategory} />
            </div>
          )}
        </div>

        {error && <p className="text-xs font-medium text-destructive">{error}</p>}

        <div className="mt-2 flex gap-2 pb-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            취소
          </Button>
          <Button type="submit" className="flex-1">
            {isEditing ? "저장하기" : "추가하기"}
          </Button>
        </div>
      </form>

      {isPickerOpen && (
        <LocationPicker
          initialCoords={hasPickedLocation ? { lat: Number(lat), lng: Number(lng) } : null}
          // 지금 수정 중인 장소 자기 자신은 bounds 기준에서 빼야, 지도가 "이 장소의 예전
          // 위치"에 편향되지 않고 나머지(형제) 장소들 기준으로 잡힙니다.
          existingPlaces={existingPlaces.filter((place) => place.id !== initialValue?.id)}
          isToday={isToday}
          onCancel={() => setIsPickerOpen(false)}
          onConfirm={handleConfirmLocation}
        />
      )}
    </>
  );
}
