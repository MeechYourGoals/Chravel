import React, { useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useLongPress } from '@/hooks/useLongPress';

interface SortableCardWrapperProps {
  id: string;
  children: React.ReactNode;
  reorderMode?: boolean;
  /** Called when user long-presses the card (mobile). Enters reorder mode. */
  onLongPressEnterReorder?: () => void;
}

export const SortableCardWrapper: React.FC<SortableCardWrapperProps> = ({
  id,
  children,
  reorderMode = false,
  onLongPressEnterReorder,
}) => {
  const handleLongPress = useCallback(() => {
    onLongPressEnterReorder?.();
  }, [onLongPressEnterReorder]);

  const longPressHandlers = useLongPress({
    onLongPress: handleLongPress,
    threshold: 500,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as const,
  };

  // When in reorder mode: subtle highlight (ring), no wiggle
  const reorderModeClasses = reorderMode
    ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
    : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'shadow-xl scale-[1.02]' : ''} ${reorderModeClasses}`}
      {...(reorderMode ? { ...attributes, ...listeners } : {})}
      {...(!reorderMode && onLongPressEnterReorder ? longPressHandlers : {})}
    >
      {/* Desktop grip handle — hidden in reorder mode since entire card is draggable */}
      {!reorderMode && (
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 z-10 p-1 rounded-md opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing transition-opacity hidden md:flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50"
          aria-label="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>
      )}
      <div className="group">{children}</div>
    </div>
  );
};
