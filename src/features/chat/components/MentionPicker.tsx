import React, { useEffect, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/utils/avatarUtils';
import { cn } from '@/lib/utils';

export interface TripMember {
  id: string;
  name: string;
  avatar?: string;
}

interface MentionPickerProps {
  members: TripMember[];
  searchQuery: string;
  onSelect: (member: TripMember) => void;
  onClose: () => void;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
}

export const MentionPicker: React.FC<MentionPickerProps> = ({
  members,
  searchQuery,
  onSelect,
  onClose,
  selectedIndex,
  onSelectedIndexChange,
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  // Filter members based on search query
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = listRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Reset selection when filtered list changes
  useEffect(() => {
    if (selectedIndex >= filteredMembers.length) {
      onSelectedIndexChange(Math.max(0, filteredMembers.length - 1));
    }
  }, [filteredMembers.length, selectedIndex, onSelectedIndexChange]);

  if (filteredMembers.length === 0) {
    return (
      <div className="absolute bottom-full left-0 mb-2 w-64 bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-lg p-3 z-50">
        <p className="text-sm text-muted-foreground">No members found</p>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 mb-2 w-72 max-h-48 overflow-y-auto bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-lg z-50"
    >
      <div className="p-1">
        <p className="px-3 py-1.5 text-xs text-muted-foreground font-medium">Mention a member</p>
        {filteredMembers.map((member, index) => (
          <button
            key={member.id}
            onClick={() => onSelect(member)}
            onMouseEnter={() => onSelectedIndexChange(index)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
              index === selectedIndex
                ? 'bg-primary/20 text-foreground'
                : 'hover:bg-muted/50 text-foreground',
            )}
          >
            <Avatar className="w-7 h-7">
              <AvatarImage src={member.avatar} alt={member.name} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate">{member.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
