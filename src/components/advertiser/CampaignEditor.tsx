import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { X, Upload } from 'lucide-react';
import { CampaignWithTargeting, CampaignFormData, MAX_CAMPAIGN_TAGS, MAX_CAMPAIGN_IMAGES, CAMPAIGN_TAG_CATEGORIES } from '@/types/advertiser';
import { AdvertiserService } from '@/services/advertiserService';
import { useToast } from '@/hooks/use-toast';

interface CampaignEditorProps {
  campaign: CampaignWithTargeting;
  onClose: () => void;
  onSuccess: () => void;
}

export const CampaignEditor = ({ campaign, onClose, onSuccess }: CampaignEditorProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState<CampaignFormData>({
    name: campaign.name,
    description: campaign.description || '',
    discount_details: campaign.discount_details,
    images: campaign.images,
    destination_info: campaign.destination_info,
    tags: campaign.tags,
    status: campaign.status === 'draft' ? 'draft' : 'active',
    start_date: campaign.start_date,
    end_date: campaign.end_date,
    targeting: campaign.targeting ? {
      age_min: campaign.targeting.age_min,
      age_max: campaign.targeting.age_max,
      genders: campaign.targeting.genders,
      interests: campaign.targeting.interests,
      locations: campaign.targeting.locations,
      trip_types: campaign.targeting.trip_types
    } : {
      genders: ['all'],
      interests: [],
      locations: [],
      trip_types: []
    }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = MAX_CAMPAIGN_IMAGES - formData.images.length;
    if (files.length > remainingSlots) {
      toast({
        title: "Too Many Images",
        description: `You can only upload ${remainingSlots} more image(s). Maximum is ${MAX_CAMPAIGN_IMAGES}.`,
        variant: "destructive"
      });
      return;
    }

    setUploadingImage(true);
    const newImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = await AdvertiserService.uploadCampaignImage(file);
      
      if (url) {
        newImages.push({
          url,
          alt: file.name,
          order: formData.images.length + i
        });
      }
    }

    setFormData({
      ...formData,
      images: [...formData.images, ...newImages]
    });
    setUploadingImage(false);
  };

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await AdvertiserService.updateCampaign(campaign.id, formData);
      
      toast({
        title: "Campaign Updated",
        description: `"${formData.name}" has been updated successfully`
      });
      onSuccess();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Campaign</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Name */}
          <div>
            <Label htmlFor="name" className="text-gray-300">Campaign Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 bg-gray-800 border-gray-700 text-white"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-gray-300">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 bg-gray-800 border-gray-700 text-white"
              rows={3}
            />
          </div>

          {/* Discount Details */}
          <div>
            <Label htmlFor="discount" className="text-gray-300">Discount Details</Label>
            <Input
              id="discount"
              value={formData.discount_details || ''}
              onChange={(e) => setFormData({ ...formData, discount_details: e.target.value })}
              className="mt-1 bg-gray-800 border-gray-700 text-white"
            />
          </div>

          {/* Images Section */}
          <div>
            <Label className="text-gray-300">
              Campaign Images ({formData.images.length}/{MAX_CAMPAIGN_IMAGES})
            </Label>
            
            <div className="grid grid-cols-3 gap-4 mt-2 mb-4">
              {formData.images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {formData.images.length < MAX_CAMPAIGN_IMAGES && (
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center bg-gray-800/30">
                <input
                  type="file"
                  id="image-upload"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-400">
                    {uploadingImage ? 'Uploading...' : `Click to upload (${MAX_CAMPAIGN_IMAGES - formData.images.length} slots remaining)`}
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Tags Section */}
          <div>
            <Label className="text-gray-300">
              Campaign Tags ({formData.tags.length}/{MAX_CAMPAIGN_TAGS})
            </Label>
            <p className="text-sm text-gray-400 mb-3">
              Choose tags that best describe your campaign
            </p>
            
            <div className="space-y-4 max-h-80 overflow-y-auto p-4 bg-gray-800/30 rounded-lg">
              {Object.entries(CAMPAIGN_TAG_CATEGORIES).map(([categoryKey, tags]) => (
                <div key={categoryKey}>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2 capitalize">
                    {categoryKey.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {tags.map((tag) => {
                      const isSelected = formData.tags.includes(tag.value);
                      const isDisabled = !isSelected && formData.tags.length >= MAX_CAMPAIGN_TAGS;
                      
                      return (
                        <label
                          key={tag.value}
                          className={cn(
                            "flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors",
                            isSelected
                              ? "bg-yellow-600/20 border-yellow-500"
                              : isDisabled
                              ? "bg-gray-800/30 border-gray-700 opacity-50 cursor-not-allowed"
                              : "bg-gray-800/50 border-gray-700 hover:bg-gray-800"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                tags: e.target.checked
                                  ? [...formData.tags, tag.value]
                                  : formData.tags.filter(t => t !== tag.value)
                              });
                            }}
                            className="rounded border-gray-600"
                          />
                          <span className="text-sm text-gray-300">{tag.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-2 text-sm text-gray-400">
              {formData.tags.length} / {MAX_CAMPAIGN_TAGS} tags selected
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-gray-600 text-gray-300 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !formData.name || !formData.description}
              className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
