"use client";

import { Fragment, useEffect } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Place } from "@/types/place";
import ScheduleCard from "./ScheduleCard";
import TravelConnector from "./TravelConnector";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type ScheduleListProps = {
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onShowActions: (place: Place) => void;
  onEdit: (place: Place) => void;
  onDelete: (id: string) => void;
  onReorder: (places: Place[]) => void;
};

export default function ScheduleList({
  places,
  selectedId,
  onSelect,
  onShowActions,
  onEdit,
  onDelete,
  onReorder,
}: ScheduleListProps) {
  // MouseSensor는 마우스/펜, TouchSensor는 모바일 터치를 담당합니다.
  // TouchSensor에 delay를 주면 짧은 스크롤 제스처와 드래그 시작 제스처가 충돌하지 않습니다.
  // 주의: 여기에 PointerSensor를 함께 쓰면 안 됩니다. 최신 브라우저는 터치에도 Pointer 이벤트를
  // 함께 발생시키기 때문에, PointerSensor(거리 기반)와 TouchSensor(지연 기반)가 같은 터치를
  // 동시에 잡으려고 경쟁하면서 드래그 시작이 몇 초씩 늦어지거나 두 번 시도해야 하는 문제가
  // 있었습니다. 터치는 TouchSensor 하나에만 맡기도록 MouseSensor(마우스 전용)로 분리했습니다.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 드래그로 순서를 한 번이라도 바꿔본 적이 있으면 안내 문구를 더 이상 보여주지 않습니다
  // (처음 써보는 사용자에게만 필요한 힌트라서, 계속 떠 있으면 오히려 방해가 됩니다).
  const [hasReordered, setHasReordered, isReorderedFlagLoaded] = useLocalStorage(
    "routie:hasReorderedSchedule",
    false
  );

  // 디버깅용: 배포 환경에서 안내 문구가 안 보인다는 제보가 있어, 실제로 어떤 값 때문에
  // 조건이 꺼지는지 브라우저 콘솔에서 바로 확인할 수 있게 남겨둡니다. shouldShowDragHint가
  // false인데 placesLength가 2 이상이라면, hasReordered가 이미 true(이 브라우저에서 예전에
  // 드래그해본 적이 있음 — localStorage는 도메인별로 남으므로 배포 주소에서 테스트했다면
  // 정상적인 동작입니다)인지, 혹은 isLoaded가 false로 멈춰있는지(localStorage 접근 자체가
  // 막혀 있는 경우, 예: 시크릿 모드/쿠키 차단)를 이 값들로 구분할 수 있습니다.
  useEffect(() => {
    console.log("[Routie][Debug][ScheduleList] 드래그 안내 문구 표시 여부", {
      placesLength: places.length,
      hasReordered,
      isReorderedFlagLoaded,
      shouldShowDragHint: places.length >= 2 && !hasReordered,
    });
  }, [places.length, hasReordered, isReorderedFlagLoaded]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = places.findIndex((place) => place.id === active.id);
    const newIndex = places.findIndex((place) => place.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(places, oldIndex, newIndex));
    if (!hasReordered) setHasReordered(true);
  };

  const handleMove = (id: string, direction: "up" | "down") => {
    const index = places.findIndex((place) => place.id === id);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= places.length) return;
    onReorder(arrayMove(places, index, targetIndex));
  };

  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <div className="flex flex-col gap-0.5 px-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">일정</h2>
          <span className="text-xs text-muted-foreground">총 {places.length}곳</span>
        </div>
        {places.length >= 2 && !hasReordered && (
          <p className="mb-1.5 text-[11px] text-[#999]">카드를 드래그하여 순서를 변경해보세요.</p>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={places.map((place) => place.id)} strategy={verticalListSortingStrategy}>
          {places.map((place, index) => (
            <Fragment key={place.id}>
              <ScheduleCard
                place={place}
                order={index + 1}
                isSelected={place.id === selectedId}
                isFirst={index === 0}
                isLast={index === places.length - 1}
                onSelect={() => onSelect(place.id)}
                onShowActions={() => onShowActions(place)}
                onEdit={() => onEdit(place)}
                onDelete={() => onDelete(place.id)}
                onMoveUp={() => handleMove(place.id, "up")}
                onMoveDown={() => handleMove(place.id, "down")}
              />
              {index < places.length - 1 && <TravelConnector from={place} to={places[index + 1]} />}
            </Fragment>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
