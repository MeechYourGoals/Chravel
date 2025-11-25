/**
 * TripLinksDisplay Component
 * 
 * Displays trip links from database with CRUD operations
 * Redesigned to match demo mode Places tab design
 */

import React, { useState, useEffect } from 'react';
import { Link2, ExternalLink, Edit, Trash2, Plus, Globe, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { AddToCalendarButton } from '../AddToCalendarButton';
import { 
  getTripLinks, 
  createTripLink, 
  updateTripLink, 
  deleteTripLink
} from '@/services/tripLinksService';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type TripLink = Database['public']['Tables']['trip_links']['Row'];

interface TripLinksDisplayProps {
  tripId: string;
}

export const TripLinksDisplay: React.FC<TripLinksDisplayProps> = ({ tripId }) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [links, setLinks] = useState<TripLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<TripLink | null>(null);

  // Form state
  const [formUrl, setFormUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('other');

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

  // Load links
  useEffect(() => {
    loadLinks();
  }, [tripId, isDemoMode]);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const fetchedLinks = await getTripLinks(tripId, isDemoMode);
      setLinks(fetchedLinks);
    } catch (error) {
      console.error('[TripLinksDisplay] Failed to load links:', error);
    } finally {
      setLoading(false);
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
      isDemoMode
    );

    if (result) {
      setLinks(prev => [result, ...prev]);
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
      isDemoMode
    );

    if (success) {
      setLinks(prev =>
        prev.map(link =>
          link.id === editingLink.id
            ? { ...link, title: formTitle, description: formDescription, category: formCategory }
            : link
        )
      );
      setEditingLink(null);
      resetForm();
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    const success = await deleteTripLink(linkId, tripId, isDemoMode);
    if (success) {
      setLinks(prev => prev.filter(link => link.id !== linkId));
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

  // Get initials from title
  const getInitials = (title: string) => {
    return title.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button - Redesigned to match demo mode */}
      <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-r from-red-600 to-red-700">
              <Link2 size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Trip Links</h3>
              <p className="text-gray-400 text-xs">
                {links.length > 0 ? `${links.length} saved links` : 'Save your trip links'}
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
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-xl transition-all font-medium text-sm flex items-center shadow-lg shadow-green-500/25"
                    >
                      <Plus size={16} className="mr-1" />
                      Add Link
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-white/10">
                    <DialogHeader>
                      <DialogTitle className="text-white">Add Trip Link</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-300 mb-1 block">URL *</label>
                        <Input
                          value={formUrl}
                          onChange={(e) => setFormUrl(e.target.value)}
                          placeholder="https://..."
                          className="bg-gray-800 border-white/10 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-300 mb-1 block">Title *</label>
                        <Input
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder="Link title"
                          className="bg-gray-800 border-white/10 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-300 mb-1 block">Description</label>
                        <Textarea
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
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
                            <SelectItem value="appetite">Appetite</SelectItem>
                            <SelectItem value="attraction">Attraction</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateLink}>
                          Add Link
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">💡 Add important URLs for your trip here. You can also promote URLs from the Media tab.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Edit Link Modal */}
      <Dialog open={!!editingLink} onOpenChange={(open) => !open && setEditingLink(null)}>
        <DialogContent className="bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Trip Link</DialogTitle>
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
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Link title"
                className="bg-gray-800 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Description</label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
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
                  <SelectItem value="appetite">Appetite</SelectItem>
                  <SelectItem value="attraction">Attraction</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingLink(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateLink}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Links List - Redesigned to match demo mode design */}
      <div className="space-y-3">
        {links.map((link) => (
          <div
            key={link.id}
            className="bg-gray-900/80 border border-white/10 rounded-2xl p-4 hover:border-sky-500/30 transition-all shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Title */}
                <h4 className="text-white font-semibold text-sm mb-1">{link.title}</h4>
                
                {/* Category Badge */}
                {link.category && (
                  <Badge variant="secondary" className="text-xs capitalize mb-2">
                    {link.category}
                  </Badge>
                )}
                
                {/* Clickable URL */}
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-3 h-3 text-sky-400 flex-shrink-0" />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sky-400 hover:text-sky-300 underline truncate"
                    title={link.url}
                  >
                    {link.url}
                  </a>
                </div>

                {/* Description */}
                {link.description && (
                  <p className="text-xs text-gray-400 mb-3">{link.description}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <AddToCalendarButton
                    placeName={link.title}
                    placeAddress={link.url}
                    category="other"
                    onEventAdded={(eventData) => {
                      // Add URL to description
                      eventData.description = `${eventData.description || ''}\n\nLink: ${link.url}`.trim();
                      toast.success('Added to calendar');
                    }}
                    variant="pill"
                  />
                  
                  <button
                    onClick={() => openEditModal(link)}
                    className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors flex items-center gap-1"
                  >
                    <Edit size={12} />
                    Edit
                  </button>

                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                </div>
              </div>

              {/* Avatar/Initial Badge */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {getInitials(link.title)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};