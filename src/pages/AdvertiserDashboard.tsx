import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, BarChart3, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AdvertiserService } from '@/services/advertiserService';
import { Advertiser, CampaignWithTargeting } from '@/types/advertiser';
import { AdvertiserOnboarding } from '@/components/advertiser/AdvertiserOnboarding';
import { CampaignList } from '@/components/advertiser/CampaignList';
import { CampaignCreator } from '@/components/advertiser/CampaignCreator';
import { CampaignAnalytics } from '@/components/advertiser/CampaignAnalytics';
import { AdvertiserSettings } from '@/components/advertiser/AdvertiserSettings';

export const AdvertiserDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!advertiser) {
    return <AdvertiserOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Chravel Advertiser Hub
              </h1>
              <span className="text-sm text-gray-500">
                {advertiser.company_name}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
              >
                Back to Chravel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Your Campaigns</h2>
              <Button onClick={() => setShowCampaignCreator(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>

            <CampaignList 
              campaigns={campaigns} 
              onRefresh={loadAdvertiserData}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <CampaignAnalytics campaigns={campaigns} />
          </TabsContent>

          <TabsContent value="settings">
            <AdvertiserSettings 
              advertiser={advertiser} 
              onUpdate={setAdvertiser}
            />
          </TabsContent>
        </Tabs>
      </main>

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

export default AdvertiserDashboard;