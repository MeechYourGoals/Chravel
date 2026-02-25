import React from 'react';
import { Check, ChevronDown, Users, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Badge } from '../ui/badge';
import { useTripMembers } from '../../hooks/useTripMembers';

interface TripMember {
  id: string;
  name: string;
  avatar?: string;
}

interface CollaboratorSelectorProps {
  tripId: string;
  selectedMembers: string[];
  onMembersChange: (memberIds: string[]) => void;
  isSingleTask: boolean;
}

export const CollaboratorSelector = ({
  tripId,
  selectedMembers,
  onMembersChange,
  isSingleTask,
}: CollaboratorSelectorProps) => {
  const { tripMembers: rawTripMembers, loading } = useTripMembers(tripId);
  const tripMembers = Array.isArray(rawTripMembers) ? rawTripMembers : [];
  const [open, setOpen] = React.useState(false);

  // Auto-select all members for group tasks
  React.useEffect(() => {
    if (!isSingleTask && tripMembers.length > 0 && selectedMembers.length === 0) {
      onMembersChange(tripMembers.map(m => m.id));
    }
  }, [isSingleTask, tripMembers, selectedMembers.length, onMembersChange]);

  const handleMemberToggle = (memberId: string) => {
    if (isSingleTask) {
      // Single task: allow multiple assignments but suggest one
      if (selectedMembers.includes(memberId)) {
        onMembersChange(selectedMembers.filter(id => id !== memberId));
      } else {
        onMembersChange([...selectedMembers, memberId]);
      }
    } else {
      // Group task: toggle individual member
      if (selectedMembers.includes(memberId)) {
        onMembersChange(selectedMembers.filter(id => id !== memberId));
      } else {
        onMembersChange([...selectedMembers, memberId]);
      }
    }
  };

  const selectedMemberNames = tripMembers
    .filter(m => selectedMembers.includes(m.id))
    .map(m => m.name)
    .join(', ');

  const displayText =
    selectedMembers.length === 0
      ? isSingleTask
        ? 'Assign to someone'
        : 'Assign to group'
      : selectedMembers.length === tripMembers.length && !isSingleTask
        ? 'Everyone'
        : selectedMemberNames;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Users size={16} />
        <span>Loading members...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">
          {isSingleTask ? 'Assign to:' : 'Group members:'}
        </span>
        {!isSingleTask && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const allSelected = selectedMembers.length === tripMembers.length;
              onMembersChange(allSelected ? [] : tripMembers.map(m => m.id));
            }}
            className="text-xs text-gray-400 hover:text-white"
          >
            {selectedMembers.length === tripMembers.length ? 'Deselect All' : 'Select All'}
          </Button>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          >
            <div className="flex items-center gap-2 min-w-0">
              {isSingleTask ? (
                <User size={16} className="text-gray-400 shrink-0" />
              ) : (
                <Users size={16} className="text-gray-400 shrink-0" />
              )}
              <span className="truncate">{displayText}</span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-gray-800 border-gray-600 z-50">
          <Command className="bg-gray-800">
            <CommandInput
              placeholder="Search members..."
              className="bg-gray-800 border-gray-600 text-white"
            />
            <CommandList>
              <CommandEmpty>No members found.</CommandEmpty>
              <CommandGroup>
                {tripMembers.map(member => (
                  <CommandItem
                    key={member.id}
                    onSelect={() => handleMemberToggle(member.id)}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="text-xs">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white">{member.name}</span>
                    </div>
                    <Check
                      className={`h-4 w-4 ${
                        selectedMembers.includes(member.id) ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Members Preview */}
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tripMembers
            .filter(m => selectedMembers.includes(m.id))
            .map(member => (
              <Badge
                key={member.id}
                variant="secondary"
                className="text-xs bg-gray-700 text-gray-200"
              >
                {member.name}
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
};
