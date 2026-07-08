"use client";

import { useRef, useState } from "react";
import OutingHeader from "@/components/OutingHeader";
import Map from "@/components/Map";
import ScheduleList from "@/components/ScheduleList";
import BottomSheet from "@/components/BottomSheet";
import PlaceForm from "@/components/PlaceForm";
import SavedPlacesPicker from "@/components/SavedPlacesPicker";
import FloatingButton from "@/components/FloatingButton";
import SaveStatusIndicator from "@/components/SaveStatusIndicator";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useOuting } from "@/hooks/useOutings";
import { useFavorites } from "@/hooks/useFavorites";
import { getTodayDateString } from "@/lib/date";
import { getNaverDirectionsUrl } from "@/lib/naver";
import { generateId } from "@/lib/id";
import { Place } from "@/types/place";
import { FavoritePlace } from "@/types/favorite";
import { Bookmark, MapPin, Navigation } from "lucide-react";

type OutingScreenProps = {
  date: string;
};

export default function OutingScreen({ date }: OutingScreenProps) {
  const { places, setPlaces, title, setTitle } = useOuting(date);
  const [, setFavorites] = useFavorites();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSavedPlacesOpen, setIsSavedPlacesOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [actionsFor, setActionsFor] = useState<Place | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isToday = date === getTodayDateString();

  const handleAddPlace = (place: Place) => {
    setPlaces((prev) => [...prev, place]);
    setIsAddOpen(false);
    setSelectedId(place.id);
  };

  const handleEditPlace = (updated: Place) => {
    setPlaces((prev) => prev.map((place) => (place.id === updated.id ? updated : place)));
    setEditingPlace(null);
  };

  const handleDelete = (id: string) => {
    setPlaces((prev) => prev.filter((place) => place.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  };

  const handleSaveAsFavorite = (favorite: FavoritePlace) => {
    setFavorites((prev) => [...prev, favorite]);
  };

  const handlePickSavedPlace = (favorite: FavoritePlace) => {
    handleAddPlace({
      id: generateId(),
      name: favorite.name,
      memo: favorite.memo,
      lat: favorite.lat,
      lng: favorite.lng,
    });
    setIsSavedPlacesOpen(false);
  };

  const handleViewOnMap = () => {
    if (actionsFor) setSelectedId(actionsFor.id);
    setActionsFor(null);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenDirections = () => {
    if (actionsFor) window.open(getNaverDirectionsUrl(actionsFor), "_blank", "noopener,noreferrer");
    setActionsFor(null);
  };

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-background">
      <OutingHeader date={date} isToday={isToday} title={title} onRenameTitle={setTitle} />

      <div className="relative isolate z-0 h-[42vh] min-h-[220px] w-full shrink-0 overflow-hidden bg-accent max-[390px]:h-[36vh] max-[390px]:min-h-[190px]">
        <p className="absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          지도에서 방문 순서를 확인해보세요
        </p>
        <Map places={places} selectedId={selectedId} onSelectPlace={setSelectedId} />
      </div>

      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto"
        style={{ paddingBottom: "max(5rem, calc(env(safe-area-inset-bottom) + 4.5rem))" }}
      >
        {places.length === 0 ? (
          <EmptyState />
        ) : (
          <ScheduleList
            places={places}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onShowActions={setActionsFor}
            onEdit={setEditingPlace}
            onDelete={handleDelete}
            onReorder={setPlaces}
          />
        )}
      </div>

      <SaveStatusIndicator />
      <FloatingButton onClick={() => setIsAddOpen(true)} />

      <BottomSheet open={isAddOpen} onOpenChange={setIsAddOpen} title="장소 추가">
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setIsAddOpen(false);
              setIsSavedPlacesOpen(true);
            }}
          >
            <Bookmark className="h-4 w-4" />
            저장한 장소 불러오기
          </Button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            또는 새로 입력
            <span className="h-px flex-1 bg-border" />
          </div>

          <PlaceForm
            existingCount={places.length}
            onCancel={() => setIsAddOpen(false)}
            onSubmit={handleAddPlace}
            onSaveAsFavorite={handleSaveAsFavorite}
          />
        </div>
      </BottomSheet>

      <SavedPlacesPicker open={isSavedPlacesOpen} onOpenChange={setIsSavedPlacesOpen} onPick={handlePickSavedPlace} />

      <BottomSheet
        open={editingPlace !== null}
        onOpenChange={(open) => !open && setEditingPlace(null)}
        title="장소 수정"
      >
        {editingPlace && (
          <PlaceForm
            initialValue={editingPlace}
            existingCount={places.length}
            onCancel={() => setEditingPlace(null)}
            onSubmit={handleEditPlace}
            onSaveAsFavorite={handleSaveAsFavorite}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={actionsFor !== null}
        onOpenChange={(open) => !open && setActionsFor(null)}
        title={actionsFor?.name ?? ""}
      >
        <div className="flex flex-col gap-2 pb-1">
          <Button type="button" variant="outline" className="justify-start" onClick={handleViewOnMap}>
            <MapPin className="h-4 w-4" />
            지도에서 보기
          </Button>
          <Button type="button" variant="outline" className="justify-start" onClick={handleOpenDirections}>
            <Navigation className="h-4 w-4" />
            네이버지도에서 길찾기
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
