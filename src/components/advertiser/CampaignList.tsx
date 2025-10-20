import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Edit2, 
  Trash2, 
  BarChart2, 
  Calendar,
  DollarSign,
  MousePointer,
  TrendingUp,
  Pause,
  Play
} from 'lucide-react';
import { CampaignWithTargeting } from '@/types/advertiser';
import { AdvertiserService } from '@/services/advertiserService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CampaignListProps {
  campaigns: CampaignWithTargeting[];
  onRefresh: () => void;
}

export const CampaignList = ({ campaigns, onRefresh }: CampaignListProps) => {
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'draft': return 'bg-gray-500';
      case 'ended': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleStatusToggle = async (campaign: CampaignWithTargeting) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    const success = await AdvertiserService.updateCampaignStatus(campaign.id, newStatus);
    
    if (success) {
      toast({
        title: "Status Updated",
        description: `Campaign "${campaign.name}" is now ${newStatus}`
      });
      onRefresh();
    } else {
      toast({
        title: "Error",
        description: "Failed to update campaign status",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Are you sure you want to delete "${campaignName}"?`)) return;

    const success = await AdvertiserService.deleteCampaign(campaignId);
    
    if (success) {
      toast({
        title: "Campaign Deleted",
        description: `"${campaignName}" has been deleted`
      });
      onRefresh();
    } else {
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive"
      });
    }
  };

  if (campaigns.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <p className="text-gray-500 mb-4">No campaigns yet</p>
          <p className="text-sm text-gray-400">
            Create your first campaign to start advertising on Chravel
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {campaigns.map((campaign) => (
        <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{campaign.name}</CardTitle>
                <div className="flex items-center gap-3 mt-2">
                  <Badge className={`${getStatusColor(campaign.status)} text-white`}>
                    {campaign.status}
                  </Badge>
                  {campaign.discount_details && (
                    <Badge variant="outline">
                      {campaign.discount_details}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {campaign.status === 'draft' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusToggle(campaign)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                ) : campaign.status === 'active' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusToggle(campaign)}
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button size="sm" variant="outline">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(campaign.id, campaign.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{campaign.description}</p>
            
            {/* Campaign Dates */}
            {(campaign.start_date || campaign.end_date) && (
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <Calendar className="h-4 w-4" />
                <span>
                  {campaign.start_date 
                    ? format(new Date(campaign.start_date), 'MMM d, yyyy')
                    : 'No start date'
                  } - {campaign.end_date 
                    ? format(new Date(campaign.end_date), 'MMM d, yyyy')
                    : 'No end date'
                  }
                </span>
              </div>
            )}

            {/* Campaign Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center text-gray-500 mb-1">
                  <Eye className="h-4 w-4 mr-1" />
                  <span className="text-xs">Impressions</span>
                </div>
                <p className="text-2xl font-semibold">{campaign.impressions.toLocaleString()}</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center text-gray-500 mb-1">
                  <MousePointer className="h-4 w-4 mr-1" />
                  <span className="text-xs">Clicks</span>
                </div>
                <p className="text-2xl font-semibold">{campaign.clicks.toLocaleString()}</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center text-gray-500 mb-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span className="text-xs">CTR</span>
                </div>
                <p className="text-2xl font-semibold">
                  {campaign.impressions > 0 
                    ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
                    : '0.00'
                  }%
                </p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center text-gray-500 mb-1">
                  <DollarSign className="h-4 w-4 mr-1" />
                  <span className="text-xs">Conversions</span>
                </div>
                <p className="text-2xl font-semibold">{campaign.conversions.toLocaleString()}</p>
              </div>
            </div>

            {/* Targeting Info */}
            {campaign.targeting && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500 mb-2">Targeting:</p>
                <div className="flex flex-wrap gap-2">
                  {campaign.targeting.interests?.map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest.replace('_', ' ')}
                    </Badge>
                  ))}
                  {campaign.targeting.locations?.map((location) => (
                    <Badge key={location} variant="secondary">
                      📍 {location}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};