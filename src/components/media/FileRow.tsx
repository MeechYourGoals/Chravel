import { useState } from 'react';

interface FileRowProps {
  id: string;
  name: string;
  url: string;
  onDelete: (id: string) => void;
}

/**
 * FileRow - Swipe-to-delete for FILES ONLY (iOS-Native pattern)
 *
 * This is only for non-image, non-video files (PDFs, docs, etc.)
 * Matches native iOS Files / Mail behavior
 */
export function FileRow({ id, name, url, onDelete }: FileRowProps) {
  const [swiped, setSwiped] = useState(false);
  const [startX, setStartX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setSwiped(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const diff = startX - currentX;
    // Swipe left to reveal delete
    if (diff > 50) {
      setSwiped(true);
    } else if (diff < -30) {
      setSwiped(false);
    }
  };

  const handleTouchEnd = () => {
    // Keep swiped state
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete button revealed on swipe */}
      {swiped && (
        <button
          onClick={() => onDelete(id)}
          className="absolute right-0 top-0 h-full w-20 bg-red-600 text-white text-sm font-medium flex items-center justify-center"
        >
          Delete
        </button>
      )}

      {/* Main content */}
      <div
        className={`flex items-center justify-between bg-neutral-900 p-4 transition-transform duration-200 ${
          swiped ? '-translate-x-20' : ''
        }`}
      >
        <span className="truncate text-sm text-white flex-1">{name}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 text-sm hover:text-blue-300 ml-3"
          onClick={(e) => e.stopPropagation()}
        >
          Open
        </a>
      </div>
    </div>
  );
}
