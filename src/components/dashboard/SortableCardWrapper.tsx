import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableCardWrapperProps {
  id: string;
  children: React.ReactNode;
  reorderMode?: boolean;
}

export const SortableCardWrapper: React.FC<SortableCardWrapperProps> = ({
  id,
  children,
  reorderMode = false,
}) => {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'shadow-xl scale-[1.02]' : ''} ${reorderMode ? 'animate-wiggle' : ''}`}
      {...(reorderMode ? { ...attributes, ...listeners } : {})}
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
