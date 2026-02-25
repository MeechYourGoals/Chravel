import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { SortableCardWrapper } from './SortableCardWrapper';
import { useDashboardCardOrder } from '@/hooks/useDashboardCardOrder';

type DashboardType = 'my_trips' | 'pro' | 'events';

interface SortableTripGridProps<T> {
  items: T[];
  getId: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  dashboardType: DashboardType;
  userId: string | undefined;
  reorderMode?: boolean;
  isMobile?: boolean;
  /** Called when user long-presses a card to enter reorder mode (mobile) */
  onLongPressEnterReorder?: () => void;
}

export function SortableTripGrid<T>({
  items,
  getId,
  renderCard,
  dashboardType,
  userId,
  reorderMode = false,
  isMobile = false,
  onLongPressEnterReorder,
}: SortableTripGridProps<T>) {
  const { applyOrder, saveOrder } = useDashboardCardOrder(userId, dashboardType);
  const [orderedItems, setOrderedItems] = useState<T[]>([]);

  // Apply saved order whenever items change
  useEffect(() => {
    setOrderedItems(applyOrder(items, getId));
  }, [items, applyOrder, getId]);

  // Mobile: use delay + tolerance to distinguish scroll from drag. Desktop: distance only.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: isMobile ? { delay: 100, tolerance: 10 } : { distance: 8 },
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setOrderedItems(prev => {
        const oldIndex = prev.findIndex(item => getId(item) === active.id);
        const newIndex = prev.findIndex(item => getId(item) === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;

        const reordered = arrayMove(prev, oldIndex, newIndex);
        saveOrder(reordered.map(getId));
        return reordered;
      });
    },
    [getId, saveOrder],
  );

  const ids = orderedItems.map(getId);
  const strategy = useMemo(
    () => (isMobile ? verticalListSortingStrategy : rectSortingStrategy),
    [isMobile],
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={strategy}>
        {orderedItems.map(item => (
          <SortableCardWrapper
            key={getId(item)}
            id={getId(item)}
            reorderMode={reorderMode}
            onLongPressEnterReorder={onLongPressEnterReorder}
          >
            {renderCard(item)}
          </SortableCardWrapper>
        ))}
      </SortableContext>
    </DndContext>
  );
}
