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
import { useDemoModeStore } from '@/store/demoModeStore';

export const AdvertiserDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isDemoMode = useDemoModeStore((state) => state.isDemoMode);
  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignWithTargeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCampaignCreator, setShowCampaignCreator] = useState(false);
  const [selectedTab, setSelectedTab] = useState('campaigns');

  // Demo mode mock data
  const mockAdvertiser: Advertiser = {
    id: 'demo-advertiser-1',
    user_id: 'demo-user-1',
    company_name: 'Paradise Resorts International',
    company_email: 'marketing@paradiseresorts.com',
    website: 'https://www.paradiseresorts.com',
    status: 'active',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockCampaigns: CampaignWithTargeting[] = [
    {
      id: 'demo-campaign-uber',
      advertiser_id: 'demo-advertiser-1',
      name: 'Uber - Premium Airport Rides',
      description: 'Flat $10 off airport rides for Chravel users. Choose from Uber Comfort or Uber Black for luxury travel.',
      discount_details: '$10 off airport rides',
      images: [
        { url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800', alt: 'Airport terminal', order: 0 },
        { url: 'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=800', alt: 'Luxury car interior', order: 1 },
        { url: 'https://images.unsplash.com/photo-1606768666853-403c90a981ad?w=800', alt: 'City skyline', order: 2 }
      ],
      destination_info: {
        location: 'Miami, FL'
      },
      tags: ['rideshare', 'airport-transfer', 'premium-service', 'city-travel'],
      status: 'active',
      impressions: 15234,
      clicks: 1203,
      conversions: 89,
      start_date: new Date('2024-01-01').toISOString(),
      end_date: new Date('2024-12-31').toISOString(),
      created_at: new Date('2024-01-01').toISOString(),
      updated_at: new Date('2024-01-01').toISOString(),
      targeting: {
        id: 'demo-targeting-uber',
        campaign_id: 'demo-campaign-uber',
        age_min: 21,
        age_max: 65,
        genders: ['all'],
        interests: ['business-travel', 'airport-transportation', 'premium-services'],
        locations: ['United States', 'Canada'],
        trip_types: ['business', 'leisure', 'group'],
        created_at: new Date('2024-01-01').toISOString(),
        updated_at: new Date('2024-01-01').toISOString()
      }
    },
    {
      id: 'demo-campaign-lyft',
      advertiser_id: 'demo-advertiser-1',
      name: 'Lyft - Reliable City Rides',
      description: 'Safe, friendly rides when you need them. New user discount for Chravel members available citywide.',
      discount_details: 'New user discount for Chravel',
      images: [
        { url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800', alt: 'City street view', order: 0 },
        { url: 'https://images.unsplash.com/photo-1502489597346-dad15683d4c2?w=800', alt: 'Happy passenger', order: 1 }
      ],
      destination_info: {
        location: 'Major Cities Nationwide'
      },
      tags: ['rideshare', 'city-travel', 'new-user-offer', 'budget-friendly'],
      status: 'active',
      impressions: 12876,
      clicks: 945,
      conversions: 67,
      start_date: new Date('2024-02-01').toISOString(),
      end_date: new Date('2024-11-30').toISOString(),
      created_at: new Date('2024-02-01').toISOString(),
      updated_at: new Date('2024-02-01').toISOString(),
      targeting: {
        id: 'demo-targeting-lyft',
        campaign_id: 'demo-campaign-lyft',
        age_min: 18,
        age_max: 55,
        genders: ['all'],
        interests: ['city-exploration', 'nightlife', 'dining'],
        locations: ['United States', 'Canada'],
        trip_types: ['leisure', 'group', 'solo'],
        created_at: new Date('2024-02-01').toISOString(),
        updated_at: new Date('2024-02-01').toISOString()
      }
    },
    {
      id: 'demo-campaign-hotels',
      advertiser_id: 'demo-advertiser-1',
      name: 'Hotels.com - Compare & Save',
      description: 'Compare hotel prices and earn rewards. Get one night free for every 10 nights booked.',
      discount_details: 'Collect 10 nights, get 1 free',
      images: [
        { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', alt: 'Luxury hotel exterior', order: 0 },
        { url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', alt: 'Hotel pool view', order: 1 },
        { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', alt: 'Comfortable hotel room', order: 2 }
      ],
      destination_info: {
        location: 'Global Hotel Network'
      },
      tags: ['lodging', 'price-comparison', 'rewards-program', 'travel-booking'],
      status: 'active',
      impressions: 18765,
      clicks: 1456,
      conversions: 134,
      start_date: new Date('2024-01-15').toISOString(),
      end_date: new Date('2024-12-31').toISOString(),
      created_at: new Date('2024-01-15').toISOString(),
      updated_at: new Date('2024-01-15').toISOString(),
      targeting: {
        id: 'demo-targeting-hotels',
        campaign_id: 'demo-campaign-hotels',
        age_min: 25,
        age_max: 65,
        genders: ['all'],
        interests: ['hotels', 'accommodations', 'travel-planning'],
        locations: ['United States', 'Canada', 'United Kingdom', 'Australia'],
        trip_types: ['leisure', 'business', 'family', 'romantic'],
        created_at: new Date('2024-01-15').toISOString(),
        updated_at: new Date('2024-01-15').toISOString()
      }
    }
  ];

  useEffect(() => {
    if (isDemoMode) {
      // In demo mode, bypass authentication and load mock data immediately
      setAdvertiser(mockAdvertiser);
      setCampaigns(mockCampaigns);
      setIsLoading(false);
    } else {
      loadAdvertiserData();
    }
  }, [isDemoMode]);

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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // NEVER show onboarding in demo mode - bypass authentication wall for investors/demos
  if (!isDemoMode && !advertiser) {
    return <AdvertiserOnboarding onComplete={handleOnboardingComplete} />;
  }

  // Use mock data directly in demo mode if advertiser isn't set yet
  const activeAdvertiser = isDemoMode ? (advertiser || mockAdvertiser) : advertiser;
  const activeCampaigns = isDemoMode ? (campaigns.length > 0 ? campaigns : mockCampaigns) : campaigns;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-2 px-4 text-center">
          <p className="text-sm font-medium">
            🎭 Demo Mode Active - This is a preview of the Chravel Advertiser Hub
          </p>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">
                Chravel Advertiser Hub
              </h1>
              <span className="text-sm text-gray-400">
                {activeAdvertiser?.company_name || 'Loading...'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="border-gray-600 text-gray-300 hover:bg-white/10"
              >
                Back to Chravel
              </Button>
              {!isDemoMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-gray-300 hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-8 bg-gray-800 border-gray-700">
            <TabsTrigger value="campaigns" className="flex items-center gap-2 data-[state=active]:bg-red-600">
              <Plus className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-red-600">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-red-600">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Your Campaigns</h2>
              <Button 
                onClick={() => setShowCampaignCreator(true)}
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>

            <CampaignList 
              campaigns={activeCampaigns} 
              onRefresh={loadAdvertiserData}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <CampaignAnalytics campaigns={activeCampaigns} />
          </TabsContent>

          <TabsContent value="settings">
            <AdvertiserSettings 
              advertiser={activeAdvertiser} 
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