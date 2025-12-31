import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  X,
  Upload,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  MapPin,
  Tag,
  Users,
  DollarSign,
  Check,
} from 'lucide-react';
import {
  CampaignFormData,
  CampaignImage,
  MAX_CAMPAIGN_TAGS,
  MAX_CAMPAIGN_IMAGES,
  CAMPAIGN_DURATION_OPTIONS,
} from '@/types/advertiser';
import { AdvertiserService } from '@/services/advertiserService';
import { useToast } from '@/hooks/use-toast';
import { CampaignPreview } from './CampaignPreview';

interface CampaignCreatorProps {
  onClose: () => void;
  onSuccess: () => void;
}

const INTERESTS = [
  'nightlife',
  'live_music',
  'dancing',
  'happy_hour',
  'group_outings',
  'food_dining',
  'cocktails',
  'rooftop_venues',
  'date_night',
  'adventure',
  'beach',
  'cultural',
  'luxury',
  'budget_travel',
];

const TRIP_TYPES = ['leisure', 'business', 'group', 'family', 'solo', 'romantic'];

export const CampaignCreator = ({ onClose, onSuccess }: CampaignCreatorProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');

  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    discount_details: '',
    images: [],
    destination_info: {},
    tags: [],
    status: 'draft',
    website_url: '',
    duration: '1_month',
    targeting: {
      genders: ['all'],
      interests: [],
      locations: [],
      trip_types: [],
    },
  });

  const steps = [
    { id: 1, title: 'Campaign Details', icon: Tag },
    { id: 2, title: 'Images & Media', icon: ImageIcon },
    { id: 3, title: 'Targeting', icon: Users },
    { id: 4, title: 'Schedule & Budget', icon: DollarSign },
    { id: 5, title: 'Review & Launch', icon: Check },
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Check if adding these files would exceed the limit
    const remainingSlots = MAX_CAMPAIGN_IMAGES - formData.images.length;
    if (files.length > remainingSlots) {
      toast({
        title: 'Too Many Images',
        description: `You can only upload ${remainingSlots} more image(s). Maximum is ${MAX_CAMPAIGN_IMAGES}.`,
        variant: 'destructive',
      });
      e.target.value = ''; // Reset input
      return;
    }

    setUploadingImage(true);
    const newImages: CampaignImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = await AdvertiserService.uploadCampaignImage(file);

      if (url) {
        newImages.push({
          url,
          alt: file.name,
          order: formData.images.length + i,
        });
      }
    }

    setFormData({
      ...formData,
      images: [...formData.images, ...newImages],
    });
    setUploadingImage(false);

    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const campaign = await AdvertiserService.createCampaign(formData);

      if (campaign) {
        toast({
          title: 'Campaign Created!',
          description: `"${campaign.name}" has been created successfully`,
        });
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to create campaign. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Summer Beach Getaway Special"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your offer and what makes it special..."
                className="mt-1"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="discount">Discount Details (Optional)</Label>
              <Input
                id="discount"
                value={formData.discount_details || ''}
                onChange={e => setFormData({ ...formData, discount_details: e.target.value })}
                placeholder="20% off first booking"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="location">Destination</Label>
              <div className="flex gap-2 mt-1">
                <MapPin className="h-5 w-5 text-gray-400 mt-2" />
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="City"
                    value={formData.destination_info?.city || ''}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        destination_info: { ...formData.destination_info, city: e.target.value },
                      })
                    }
                  />
                  <Input
                    placeholder="Country"
                    value={formData.destination_info?.country || ''}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        destination_info: { ...formData.destination_info, country: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="website_url">Website URL (for Book Now button)</Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url || ''}
                onChange={e => setFormData({ ...formData, website_url: e.target.value })}
                placeholder="https://www.yourcompany.com/booking"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                This URL will be used for the "Book Now" button on your campaign card
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label>Campaign Images</Label>
              <p className="text-sm text-gray-500 mb-2">
                Upload carousel images for your campaign ({formData.images.length}/
                {MAX_CAMPAIGN_IMAGES})
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4">
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
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
                    <span className="text-sm text-gray-600">
                      {uploadingImage
                        ? 'Uploading...'
                        : `Click to upload (${MAX_CAMPAIGN_IMAGES - formData.images.length} slots remaining)`}
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div>
              <Label>Campaign Tags (Up to {MAX_CAMPAIGN_TAGS} custom tags)</Label>
              <p className="text-sm text-gray-400 mb-3">
                Add custom tags that best describe your campaign (e.g., Luxury, Beachfront, Spa)
              </p>

              {/* Current Tags Display */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      className="bg-red-600/20 border-red-500 text-white flex items-center gap-1 px-3 py-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            tags: formData.tags.filter((_, i) => i !== index),
                          });
                        }}
                        className="ml-1 hover:text-red-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Custom Tag Input */}
              {formData.tags.length < MAX_CAMPAIGN_TAGS && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a custom tag (e.g., Beachfront)"
                    value={customTagInput}
                    onChange={e => setCustomTagInput(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter' && customTagInput.trim()) {
                        e.preventDefault();
                        const newTag = customTagInput.trim();
                        if (!formData.tags.includes(newTag)) {
                          setFormData({
                            ...formData,
                            tags: [...formData.tags, newTag],
                          });
                          setCustomTagInput('');
                        }
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (customTagInput.trim()) {
                        const newTag = customTagInput.trim();
                        if (!formData.tags.includes(newTag)) {
                          setFormData({
                            ...formData,
                            tags: [...formData.tags, newTag],
                          });
                          setCustomTagInput('');
                        }
                      }
                    }}
                    disabled={!customTagInput.trim() || formData.tags.length >= MAX_CAMPAIGN_TAGS}
                  >
                    Add Tag
                  </Button>
                </div>
              )}

              <div className="mt-2 text-sm text-gray-400">
                {formData.tags.length} / {MAX_CAMPAIGN_TAGS} tags added
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label>Age Range</Label>
              <div className="flex items-center gap-4 mt-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={formData.targeting.age_min || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      targeting: { ...formData.targeting, age_min: parseInt(e.target.value) },
                    })
                  }
                  className="w-20"
                />
                <span>to</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={formData.targeting.age_max || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      targeting: { ...formData.targeting, age_max: parseInt(e.target.value) },
                    })
                  }
                  className="w-20"
                />
              </div>
            </div>

            <div>
              <Label>Interests</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {INTERESTS.map(interest => (
                  <label key={interest} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.targeting.interests.includes(interest)}
                      onChange={e => {
                        const interests = e.target.checked
                          ? [...formData.targeting.interests, interest]
                          : formData.targeting.interests.filter(i => i !== interest);
                        setFormData({
                          ...formData,
                          targeting: { ...formData.targeting, interests },
                        });
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{interest.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Trip Types</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {TRIP_TYPES.map(type => (
                  <Badge
                    key={type}
                    variant={formData.targeting.trip_types.includes(type) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const trip_types = formData.targeting.trip_types.includes(type)
                        ? formData.targeting.trip_types.filter(t => t !== type)
                        : [...formData.targeting.trip_types, type];
                      setFormData({
                        ...formData,
                        targeting: { ...formData.targeting, trip_types },
                      });
                    }}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            {/* Campaign Duration Selection */}
            <div>
              <Label>Campaign Duration</Label>
              <p className="text-sm text-gray-400 mb-3">
                Select how long you want your campaign to run
              </p>
              <div className="grid grid-cols-2 gap-3">
                {CAMPAIGN_DURATION_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const startDate = new Date();
                      const endDate = new Date();
                      endDate.setDate(endDate.getDate() + option.days);
                      setFormData({
                        ...formData,
                        duration: option.value,
                        start_date: startDate.toISOString(),
                        end_date: endDate.toISOString(),
                      });
                    }}
                    className={cn(
                      'p-4 rounded-lg border-2 text-left transition-all',
                      formData.duration === option.value
                        ? 'border-red-500 bg-red-600/10'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-800/50',
                    )}
                  >
                    <span className="font-semibold text-white">{option.label}</span>
                    <p className="text-sm text-gray-400 mt-1">{option.days} days</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Start Date Selection */}
            <div>
              <Label>Start Date</Label>
              <p className="text-sm text-gray-400 mb-2">When should your campaign begin?</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.start_date && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date
                      ? format(new Date(formData.start_date), 'PPP')
                      : 'Select start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.start_date ? new Date(formData.start_date) : undefined}
                    onSelect={date => {
                      if (date && formData.duration) {
                        const durationOption = CAMPAIGN_DURATION_OPTIONS.find(
                          opt => opt.value === formData.duration,
                        );
                        const endDate = new Date(date);
                        endDate.setDate(endDate.getDate() + (durationOption?.days || 30));
                        setFormData({
                          ...formData,
                          start_date: date.toISOString(),
                          end_date: endDate.toISOString(),
                        });
                      } else {
                        setFormData({
                          ...formData,
                          start_date: date?.toISOString(),
                        });
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date Display */}
            {formData.start_date && formData.end_date && (
              <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Campaign will run until:</span>
                </div>
                <p className="font-semibold text-white mt-1">
                  {format(new Date(formData.end_date), 'PPPP')}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div>
                <Label className="text-white">Launch Campaign Immediately</Label>
                <p className="text-sm text-gray-400">Set campaign status to active on start date</p>
              </div>
              <Switch
                checked={formData.status === 'active'}
                onCheckedChange={checked =>
                  setFormData({
                    ...formData,
                    status: checked ? 'active' : 'draft',
                  })
                }
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review Your Campaign</h3>

            {/* Live Preview */}
            <div>
              <p className="text-sm text-gray-500 mb-2">Preview (as it will appear to users):</p>
              <CampaignPreview campaign={formData} className="max-w-sm mx-auto" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Images</p>
                <p className="font-medium">{formData.images.length} images</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge className={formData.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                  {formData.status}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">Targeting</p>
              <div className="flex flex-wrap gap-2">
                {formData.targeting.interests.map(interest => (
                  <Badge key={interest} variant="outline">
                    {interest.replace('_', ' ')}
                  </Badge>
                ))}
                {formData.targeting.trip_types.map(type => (
                  <Badge key={type} variant="outline">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                {formData.status === 'active'
                  ? '✅ Your campaign will go live immediately after creation'
                  : '📝 Your campaign will be saved as a draft'}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.description;
      case 2:
        return true; // Images optional for testing (TODO: Re-enable: formData.images.length >= 2)
      case 3:
        return true; // Targeting is optional
      case 4:
        return true; // Dates are optional
      case 5:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full',
                    currentStep >= step.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-400',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-16 h-1 mx-2',
                      currentStep > step.id ? 'bg-purple-600' : 'bg-gray-200',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">{renderStep()}</div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(currentStep - 1)}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep < 5 ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading || !canProceed()}>
              {isLoading ? 'Creating...' : 'Create Campaign'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
