import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableStopItemProps {
  id: string;
  children: React.ReactNode;
}

export function SortableItem({ id, children }: SortableStopItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Clone the child and pass drag handle props
  const childWithProps = React.cloneElement(children as React.ReactElement, {
    dragHandleProps: { ...attributes, ...listeners }
  });

  return (
    <div ref={setNodeRef} style={style}>
      {childWithProps}
    </div>
  );
}