import React from 'react';
import { cn } from '@/lib/utils';

interface PersonLabelProps {
  /** Primary display: always the user's real name */
  name: string;
  /** Pro-only title, shown as a second line. Pass null/undefined to suppress. */
  title?: string | null;
  /** Whether the current trip context allows titles to be shown (Pro/Enterprise only). */
  showTitle?: boolean;
  className?: string;
  nameClassName?: string;
  titleClassName?: string;
}

/**
 * Renders a person's real name as the primary label.
 * If `showTitle` is true AND a non-empty `title` is provided, it appears on
 * a second line in smaller muted text — never inline — to avoid pill width issues.
 */
export const PersonLabel: React.FC<PersonLabelProps> = ({
  name,
  title,
  showTitle = false,
  className,
  nameClassName,
  titleClassName,
}) => {
  const displayTitle = showTitle && title?.trim() ? title.trim() : null;

  return (
    <div className={cn('min-w-0', className)}>
      <span className={cn('block truncate', nameClassName)}>{name}</span>
      {displayTitle && (
        <span
          className={cn(
            'block truncate text-xs text-gray-400 leading-tight max-w-full',
            titleClassName,
          )}
        >
          {displayTitle}
        </span>
      )}
    </div>
  );
};
