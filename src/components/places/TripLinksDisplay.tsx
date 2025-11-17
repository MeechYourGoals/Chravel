/**
 * TripLinksDisplay Component
 * 
 * Displays trip links from database with CRUD operations
 * Separate from Places-based links
 */

import React, { useState, useEffect } from 'react';
import { Link2, ExternalLink, Edit, Trash2, ThumbsUp, Plus, Globe } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  getTripLinks, 
  createTripLink, 
  updateTripLink, 
  deleteTripLink, 
  voteTripLink 
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

  const handleVoteLink = async (linkId: string) => {
    const success = await voteTripLink(linkId, tripId, isDemoMode);
    if (success) {
      setLinks(prev =>
        prev.map(link =>
          link.id === linkId ? { ...link, votes: (link.votes || 0) + 1 } : link
        )
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Trip Links ({links.length})
        </h3>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="default" onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-1" />
              Add Link
            </Button>
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

      {/* Links Grid */}
      {links.length === 0 ? (
        <div className="text-center py-12">
          <Link2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Trip Links Yet</h3>
          <p className="text-muted-foreground mb-4">
            Add links manually or promote URLs from the Media tab
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="bg-gray-900/80 border border-white/10 rounded-lg p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-sky-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-foreground font-medium mb-1">{link.title}</h4>

                  {link.description && (
                    <p className="text-xs text-muted-foreground mb-2">{link.description}</p>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-400 hover:text-sky-300 truncate"
                      title={link.url}
                    >
                      {link.url}
                    </a>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    {link.category && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {link.category}
                      </Badge>
                    )}
                    {link.votes > 0 && (
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        <span>{link.votes}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(link.url, '_blank')}
                      className="text-xs h-8"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Open
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVoteLink(link.id)}
                      className="text-xs h-8"
                    >
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      Vote
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(link)}
                      className="text-xs h-8"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLink(link.id)}
                      className="text-xs h-8 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg">
        <p className="text-xs text-muted-foreground">
          💡 <strong>Tip:</strong> Add important URLs for your trip here. 
          You can also promote URLs from the Media tab.
        </p>
      </div>
    </div>
  );
};
