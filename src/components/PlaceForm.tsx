"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, ChevronDown, MapPin } from "lucide-react";
import { DEFAULT_COORDS, Place } from "@/types/place";
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
import { useDefaultRegion } from "@/hooks/useDefaultRegion";

type PlaceFormProps = {
  /** 값이 있으면 수정 모드, 없으면 추가 모드로 동작합니다. */
  initialValue?: Place;
  existingCount: number;
  onCancel: () => void;
  onSubmit: (place: Place) => void;
  onSaveAsFavorite?: (favorite: FavoritePlace) => void;
};

export default function PlaceForm({
  initialValue,
  existingCount,
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
  const [defaultRegion] = useDefaultRegion();

  const hasPickedLocation = lat.trim() !== "" && lng.trim() !== "";

  const handleConfirmLocation = (coords: { lat: number; lng: number }) => {
    console.log("[Routie] PlaceForm에 위치 반영", coords);
    setLat(String(coords.lat));
    setLng(String(coords.lng));
    setIsPickerOpen(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("장소명을 입력해주세요");
      return;
    }

    // 위치를 선택하지 않으면 기본 지역(또는 서울) 좌표를 기준으로 살짝 오프셋을 줘서 마커가 겹치지 않게 합니다.
    const baseCoords = defaultRegion ?? DEFAULT_COORDS;
    const jitter = existingCount * 0.002;
    const parsedLat = lat.trim() ? Number(lat) : baseCoords.lat + jitter;
    const parsedLng = lng.trim() ? Number(lng) : baseCoords.lng + jitter;

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
              비워두면 설정된 기본 지역의 좌표가 자동으로 입력돼요
            </p>
          </details>
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
          onCancel={() => setIsPickerOpen(false)}
          onConfirm={handleConfirmLocation}
        />
      )}
    </>
  );
}
