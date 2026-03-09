import React from 'react';

/**
 * Custom calendar glyph optimized for small-size legibility.
 * Features prominent binding tabs, clear header bar, and optional date marks.
 * Designed to match Lucide icon stroke weight and visual balance.
 * Uses currentColor for stroke so .gold-gradient-icon works via CSS override.
 */

interface CalendarGlyphProps {
  size?: number;
  className?: string;
}

export const CalendarGlyph: React.FC<CalendarGlyphProps> = ({ size = 24, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Calendar body — rounded rect */}
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />

    {/* Binding tabs — prominent top rings */}
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="16" y1="2" x2="16" y2="6" />

    {/* Header divider line */}
    <line x1="3" y1="10" x2="21" y2="10" />

    {/* Date marks — 4 small squares for legibility at small sizes */}
    <rect x="7" y="13" width="2" height="2" rx="0.5" />
    <rect x="11" y="13" width="2" height="2" rx="0.5" />
    <rect x="15" y="13" width="2" height="2" rx="0.5" />
    <rect x="7" y="17" width="2" height="2" rx="0.5" />
  </svg>
);
