"use client";

import { Fragment } from "react";
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = places.findIndex((place) => place.id === active.id);
    const newIndex = places.findIndex((place) => place.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(places, oldIndex, newIndex));
  };

  const handleMove = (id: string, direction: "up" | "down") => {
    const index = places.findIndex((place) => place.id === id);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= places.length) return;
    onReorder(arrayMove(places, index, targetIndex));
  };

  return (
    <div className="flex flex-col gap-2">
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
