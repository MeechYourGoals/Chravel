/**
 * TripLinksDisplay Component
 *
 * Displays trip links from database with CRUD operations and drag-and-drop reordering
 * ⚡ Uses TanStack Query for cached data loading — instant on revisit
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Link2,
  ExternalLink,
  Edit,
  Trash2,
  Plus,
  Globe,
  Calendar,
  GripVertical,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { AddToCalendarButton } from '../AddToCalendarButton';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  getTripLinks,
  createTripLink,
  updateTripLink,
  deleteTripLink,
  updateTripLinksOrder,
} from '@/services/tripLinksService';
import { calendarService } from '@/services/calendarService';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import type { AddToCalendarData } from '@/types/calendar';

type TripLink = Database['public']['Tables']['trip_links']['Row'];

interface TripLinksDisplayProps {
  tripId: string;
}

// Sortable link item component
const SortableLinkItem = ({
  tripId,
  link,
  onEdit,
  onDelete,
  onAddToCalendar,
}: {
  tripId: string;
  link: TripLink;
  onEdit: (link: TripLink) => void;
  onDelete: (linkId: string) => void;
  onAddToCalendar: (eventData: AddToCalendarData, link: TripLink) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-900/80 border border-white/10 rounded-2xl p-3 md:p-4 hover:border-sky-500/30 transition-all shadow-lg"
    >
      {/* Row 1: Drag Handle, Title, Category, Action Buttons */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-white touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <h4 className="text-white font-semibold text-sm md:text-base truncate">{link.title}</h4>
          {link.category && (
            <Badge variant="secondary" className="text-xs capitalize flex-shrink-0">
              {link.category}
            </Badge>
          )}
        </div>

        <div className="flex gap-1.5 flex-shrink-0">
          <AddToCalendarButton
            tripId={tripId}
            placeName={link.title}
            placeAddress={link.url}
            category="other"
            onEventAdded={eventData => onAddToCalendar(eventData, link)}
            variant="icon"
          />

          <button
            onClick={() => onEdit(link)}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors flex items-center gap-1"
            title="Edit"
          >
            <Edit className="w-3 h-3" />
            <span className="hidden md:inline">Edit</span>
          </button>

          <button
            onClick={() => onDelete(link.id)}
            className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center gap-1"
            title="Remove"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden md:inline">Remove</span>
          </button>
        </div>
      </div>

      {/* Row 2: URL and Description */}
      <div className="flex items-start gap-2 pl-6">
        <Globe className="w-3 h-3 md:w-3.5 md:h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sky-400 hover:text-sky-300 underline truncate max-w-[200px] md:max-w-xs"
            title={link.url}
          >
            {link.url.replace(/^https?:\/\/(www\.)?/, '')}
          </a>
          {link.description && (
            <>
              <span className="text-gray-600 hidden md:inline">•</span>
              <p className="text-xs text-gray-400 truncate flex-1 min-w-0">{link.description}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const TripLinksDisplay: React.FC<TripLinksDisplayProps> = ({ tripId }) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();

  // ⚡ TanStack Query — cached across remounts, prefetchable, stale-while-revalidate
  // Guard: finite loading — retry: 1 prevents infinite retry loops; 15s timeout prevents indefinite hangs
  const FETCH_TIMEOUT_MS = 15000;
  const {
    data: links = [],
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tripLinks', tripId, isDemoMode],
    queryFn: async () => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Request timed out. Check your connection and try again.')),
          FETCH_TIMEOUT_MS,
        ),
      );
      return Promise.race([getTripLinks(tripId, isDemoMode), timeoutPromise]);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!tripId,
    retry: 1,
    retryDelay: 2000,
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<TripLink | null>(null);

  // Form state
  const [formUrl, setFormUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('other');

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Generate demo user ID
  const getDemoUserId = () => {
    let demoId = sessionStorage.getItem('demo-user-id');
    if (!demoId) {
      demoId = `demo-user-${Date.now()}`;
      sessionStorage.setItem('demo-user-id', demoId);
    }
    return demoId;
  };

  const effectiveUserId = user?.id || getDemoUserId();

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = links.findIndex(link => link.id === active.id);
      const newIndex = links.findIndex(link => link.id === over.id);

      const newLinks = arrayMove(links, oldIndex, newIndex);
      // Optimistic update via query cache
      queryClient.setQueryData<TripLink[]>(['tripLinks', tripId], newLinks);

      const orderedIds = newLinks.map(l => l.id);
      await updateTripLinksOrder(tripId, orderedIds, isDemoMode);
    }
  };

  const handleCreateLink = async () => {
    if (!formUrl.trim() || !formTitle.trim()) {
      toast.error('URL and title are required');
      return;
    }

    const result = await createTripLink(
      {
        tripId,
        url: formUrl,
        title: formTitle,
        description: formDescription || undefined,
        category: formCategory,
        addedBy: effectiveUserId,
      },
      isDemoMode,
    );

    if (result) {
      // Optimistic update via query cache
      queryClient.setQueryData<TripLink[]>(['tripLinks', tripId], old => [result, ...(old || [])]);
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  const handleUpdateLink = async () => {
    if (!editingLink) return;

    const success = await updateTripLink(
      {
        linkId: editingLink.id,
        title: formTitle,
        description: formDescription,
        category: formCategory,
      },
      tripId,
      isDemoMode,
    );

    if (success) {
      // Optimistic update via query cache
      queryClient.setQueryData<TripLink[]>(['tripLinks', tripId], old =>
        (old || []).map(link =>
          link.id === editingLink.id
            ? { ...link, title: formTitle, description: formDescription, category: formCategory }
            : link,
        ),
      );
      setEditingLink(null);
      resetForm();
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    const success = await deleteTripLink(linkId, tripId, isDemoMode);
    if (success) {
      // Optimistic update via query cache
      queryClient.setQueryData<TripLink[]>(['tripLinks', tripId], old =>
        (old || []).filter(link => link.id !== linkId),
      );
    }
  };

  const resetForm = () => {
    setFormUrl('');
    setFormTitle('');
    setFormDescription('');
    setFormCategory('other');
  };

  const openEditModal = (link: TripLink) => {
    setEditingLink(link);
    setFormUrl(link.url);
    setFormTitle(link.title);
    setFormDescription(link.description || '');
    setFormCategory(link.category || 'other');
  };

  const handleAddToCalendar = async (eventData: AddToCalendarData, link: TripLink) => {
    try {
      const startDate = new Date(eventData.date);
      const [hours, minutes] = eventData.time.split(':');
      startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));

      let endTime: string | undefined;
      if (eventData.endTime) {
        const endDate = new Date(eventData.date);
        const [endHours, endMinutes] = eventData.endTime.split(':');
        endDate.setHours(parseInt(endHours, 10), parseInt(endMinutes, 10));
        endTime = endDate.toISOString();
      }

      const description = `${eventData.description || ''}\n\nLink: ${link.url}`.trim();

      const created = await calendarService.createEvent({
        trip_id: tripId,
        title: eventData.title,
        description,
        start_time: startDate.toISOString(),
        end_time: endTime,
        location: eventData.location || link.url,
        event_category: eventData.category || 'other',
        include_in_itinerary: eventData.include_in_itinerary ?? true,
        source_type: 'places_tab',
        source_data: { link_id: link.id, link_url: link.url },
      });

      if (created) {
        toast.success('Event added to calendar!');
      } else {
        toast.error('Failed to add event to calendar');
      }
    } catch (error) {
      console.error('Failed to add event to calendar:', error);
      toast.error('Failed to add event to calendar');
    }
  };

  // Finite loading: spinner only while actively fetching; error/empty surface instead of infinite spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"
          aria-label="Loading links"
          data-testid="trip-links-loading"
        />
      </div>
    );
  }

  if (isError) {
    if (import.meta.env.DEV) {
      console.error('[TripLinksDisplay] Failed to load links:', error);
    }
    return (
      <div className="bg-gray-900/80 border border-red-500/20 rounded-2xl p-6 text-center">
        <p className="text-red-400 font-medium mb-2">Couldn&apos;t load links</p>
        <p className="text-gray-400 text-sm mb-4">
          {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
        </p>
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="border-white/20 text-white hover:bg-white/10"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-4 md:p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center bg-gradient-to-r from-red-600 to-red-700">
              <Link2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">Explore</h3>
              <p className="text-gray-400 text-xs md:text-sm">
                {links.length > 0
                  ? `${links.length} saved links • Drag to reorder`
                  : 'Share links for registries, activities, places & more'}
              </p>
            </div>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                  <DialogTrigger asChild>
                    <button
                      onClick={() => resetForm()}
                      className="bg-black/60 border border-white/30 text-white hover:bg-white/10 px-3.5 py-2.5 min-h-[42px] rounded-xl transition-all font-medium text-sm flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Link
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-white/10">
                    <DialogHeader>
                      <DialogTitle className="text-white">Add Link</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-300 mb-1 block">URL *</label>
                        <Input
                          value={formUrl}
                          onChange={e => setFormUrl(e.target.value)}
                          placeholder="https://..."
                          className="bg-gray-800 border-white/10 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-300 mb-1 block">Title *</label>
                        <Input
                          value={formTitle}
                          onChange={e => setFormTitle(e.target.value)}
                          placeholder="Link title"
                          className="bg-gray-800 border-white/10 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-300 mb-1 block">Description</label>
                        <Textarea
                          value={formDescription}
                          onChange={e => setFormDescription(e.target.value)}
                          placeholder="Optional description"
                          className="bg-gray-800 border-white/10 text-white"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-300 mb-1 block">Category</label>
                        <Select value={formCategory} onValueChange={setFormCategory}>
                          <SelectTrigger className="bg-gray-800 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-white/10">
                            <SelectItem value="accommodation">Accommodation</SelectItem>
                            <SelectItem value="activity">Activity</SelectItem>
                            <SelectItem value="appetite">Food & Dining</SelectItem>
                            <SelectItem value="attraction">Attraction</SelectItem>
                            <SelectItem value="registry">Registry</SelectItem>
                            <SelectItem value="reservations">Reservations</SelectItem>
                            <SelectItem value="transportation">Transportation</SelectItem>
                            <SelectItem value="essentials">Essentials</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateLink} className="bg-black/60 border border-white/30 text-white hover:bg-white/10">Add Link</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  💡 Share wedding registries, activities like skydiving, restaurants, hotels &
                  more. You can also promote links from the Media tab.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Edit Link Modal */}
      <Dialog open={!!editingLink} onOpenChange={open => !open && setEditingLink(null)}>
        <DialogContent className="bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 mb-1 block">URL</label>
              <Input
                value={formUrl}
                disabled
                className="bg-gray-800 border-white/10 text-gray-500"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Title *</label>
              <Input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="Link title"
                className="bg-gray-800 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Description</label>
              <Textarea
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Optional description"
                className="bg-gray-800 border-white/10 text-white"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Category</label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="bg-gray-800 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  <SelectItem value="accommodation">Accommodation</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="appetite">Food & Dining</SelectItem>
                  <SelectItem value="attraction">Attraction</SelectItem>
                  <SelectItem value="registry">Registry</SelectItem>
                  <SelectItem value="reservations">Reservations</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                  <SelectItem value="essentials">Essentials</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingLink(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateLink}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Links List - With Drag and Drop */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={links.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {links.map(link => (
              <SortableLinkItem
                key={link.id}
                tripId={tripId}
                link={link}
                onEdit={openEditModal}
                onDelete={handleDeleteLink}
                onAddToCalendar={handleAddToCalendar}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
