import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, BarChart3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdvertiserService } from '@/services/advertiserService';
import { Advertiser, CampaignWithTargeting } from '@/types/advertiser';
import { AdvertiserOnboarding } from './advertiser/AdvertiserOnboarding';
import { CampaignList } from './advertiser/CampaignList';
import { CampaignCreator } from './advertiser/CampaignCreator';
import { CampaignAnalytics } from './advertiser/CampaignAnalytics';
import { AdvertiserSettings } from './advertiser/AdvertiserSettings';

interface AdvertiserSettingsWrapperProps {
  currentUserId: string;
}

export const AdvertiserSettingsWrapper = ({ currentUserId }: AdvertiserSettingsWrapperProps) => {
  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignWithTargeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCampaignCreator, setShowCampaignCreator] = useState(false);
  const [selectedTab, setSelectedTab] = useState('campaigns');

  useEffect(() => {
    loadAdvertiserData();
  }, []);

  const loadAdvertiserData = async () => {
    try {
      setIsLoading(true);
      const profile = await AdvertiserService.getAdvertiserProfile();
      setAdvertiser(profile);
      
      if (profile) {
        const campaignData = await AdvertiserService.getCampaigns();
        setCampaigns(campaignData);
      }
    } catch (error) {
      console.error('Error loading advertiser data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async (profile: Advertiser) => {
    setAdvertiser(profile);
    await loadAdvertiserData();
  };

  const handleCampaignCreated = async () => {
    setShowCampaignCreator(false);
    await loadAdvertiserData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!advertiser) {
    return (
      <div className="p-6">
        <AdvertiserOnboarding onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white mb-2">Advertiser Hub</h3>
          <p className="text-sm text-gray-400">
            Create and manage your travel recommendation campaigns
          </p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="bg-white/10 border-white/20 mb-6">
            <TabsTrigger 
              value="campaigns" 
              className="data-[state=active]:bg-white/20 text-gray-300 data-[state=active]:text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-white/20 text-gray-300 data-[state=active]:text-white"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="data-[state=active]:bg-white/20 text-gray-300 data-[state=active]:text-white"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-0">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium text-white">Your Campaigns</h4>
                <Button 
                  onClick={() => setShowCampaignCreator(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </div>

              <CampaignList 
                campaigns={campaigns} 
                onRefresh={loadAdvertiserData}
              />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <CampaignAnalytics campaigns={campaigns} />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <AdvertiserSettings 
              advertiser={advertiser} 
              onUpdate={setAdvertiser}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Campaign Creator Modal */}
      {showCampaignCreator && (
        <CampaignCreator
          onClose={() => setShowCampaignCreator(false)}
          onSuccess={handleCampaignCreated}
        />
      )}
    </div>
  );
};