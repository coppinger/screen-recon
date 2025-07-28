import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';

export function SortableImage({ image, index, onRemove, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 p-1 bg-gray-800 text-white rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      
      <div className="absolute top-2 left-10 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {index + 1}
      </div>
      
      <img
        src={image.dataUrl}
        alt={image.name}
        className="w-full h-32 object-cover rounded-lg"
      />
      
      {!disabled && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(image.id)
          }}
          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      
      <p className="mt-1 text-xs text-gray-600 truncate">
        {image.name}
      </p>
    </div>
  );
}