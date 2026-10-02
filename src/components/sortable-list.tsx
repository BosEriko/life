"use client";

import { useId, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type SortableItemProps = {
  ref: (node: HTMLElement | null) => void;
  style: CSSProperties;
  handlers: HTMLAttributes<HTMLElement>;
  isDragging: boolean;
};

function SortableItem({ id, disabled, children }: { id: string; disabled: boolean; children: (props: SortableItemProps) => ReactNode }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id, disabled });
  return children({
    ref: setNodeRef,
    style: { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.25 : undefined },
    handlers: { ...attributes, ...listeners, "aria-roledescription": "sortable item" },
    isDragging,
  });
}

export function SortableList({
  ids,
  layout,
  disabled = false,
  onReorder,
  renderItem,
  renderOverlay,
}: {
  ids: string[];
  layout: "grid" | "list";
  disabled?: boolean;
  onReorder: (order: string[]) => void;
  renderItem: (id: string, props: SortableItemProps & { index: number; wasDragged: () => boolean }) => ReactNode;
  renderOverlay: (id: string) => ReactNode;
}) {
  const contextId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [committed, setCommitted] = useState<{ base: string; order: string[] } | null>(null);
  const justDragged = useRef(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: [KeyboardCode.Space], cancel: [KeyboardCode.Esc], end: [KeyboardCode.Space] },
    }),
  );

  const base = ids.join("|");
  const order = committed && committed.base === base && committed.order.length === ids.length ? committed.order : ids;

  function onDragStart(event: DragStartEvent) {
    justDragged.current = true;
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)));
    setCommitted({ base, order: next });
    onReorder(next);
  }

  return (
    <DndContext id={contextId} sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <SortableContext items={order} strategy={layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy} disabled={disabled}>
        {order.map((id, index) => (
          <SortableItem key={id} id={id} disabled={disabled}>
            {(props) =>
              renderItem(id, {
                ...props,
                index,
                handlers: {
                  ...props.handlers,
                  onPointerDownCapture: () => {
                    justDragged.current = false;
                  },
                },
                wasDragged: () => {
                  const value = justDragged.current;
                  justDragged.current = false;
                  return value;
                },
              })
            }
          </SortableItem>
        ))}
      </SortableContext>
      <DragOverlay>
        {activeId ? <div className="reorder-drag-preview">{renderOverlay(activeId)}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}
