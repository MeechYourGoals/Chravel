import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDemoMode } from '@/hooks/useDemoMode';

interface MediaMetaEditorProps {
  mediaId: string;
  tripId: string;
  currentCaption?: string;
  currentTags?: string[];
  onSave: (caption: string, tags: string[]) => void;
  onClose: () => void;
}

export const MediaMetaEditor = ({
  mediaId,
  tripId,
  currentCaption = '',
  currentTags = [],
  onSave,
  onClose,
}: MediaMetaEditorProps) => {
  const [caption, setCaption] = useState(currentCaption);
  const [tags, setTags] = useState<string[]>(currentTags);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (isDemoMode) {
        // Demo mode: persist to sessionStorage
        const key = `demo_media_meta_${tripId}_${mediaId}`;
        sessionStorage.setItem(key, JSON.stringify({ caption, tags }));
        onSave(caption, tags);
        toast({ title: 'Success', description: 'Media info updated (demo mode)' });
      } else {
        // Real mode: update Supabase
        const { error } = await supabase
          .from('trip_media_index')
          .update({ caption, tags })
          .eq('id', mediaId);

        if (error) throw error;

        onSave(caption, tags);
        toast({ title: 'Success', description: 'Media info updated' });
      }
      onClose();
    } catch (error) {
      console.error('Failed to update media metadata:', error);
      toast({
        title: 'Error',
        description: 'Failed to update media info',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Edit Media Info</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Caption</label>
            <Textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="min-h-[100px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Tags</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add tag..."
              />
              <Button onClick={handleAddTag} size="sm">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};
