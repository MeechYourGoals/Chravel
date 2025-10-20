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
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockCampaigns: CampaignWithTargeting[] = [
    {
      id: 'demo-campaign-1',
      advertiser_id: 'demo-advertiser-1',
      name: 'Summer Paradise Sale - 30% Off',
      description: 'Experience luxury at our beachfront resorts this summer with exclusive discounts for Chravel users.',
      discount_details: '30% off all bookings + Free spa treatment',
      images: [
        'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800'
      ],
      destination_info: {
        location: 'Maldives',
        highlights: ['Private beaches', 'Water villas', 'Spa & wellness', 'Fine dining']
      },
      tags: ['luxury', 'beach', 'resort', 'spa'],
      status: 'active',
      impressions: 12543,
      clicks: 892,
      conversions: 47,
      start_date: new Date('2024-06-01').toISOString(),
      end_date: new Date('2024-08-31').toISOString(),
      created_at: new Date('2024-05-15').toISOString(),
      targeting: [
        {
          id: 'demo-targeting-1',
          campaign_id: 'demo-campaign-1',
          interests: ['luxury travel', 'beach vacation', 'wellness'],
          locations: ['United States', 'Canada', 'United Kingdom'],
          trip_types: ['honeymoon', 'anniversary', 'romantic getaway'],
          created_at: new Date('2024-05-15').toISOString()
        }
      ]
    },
    {
      id: 'demo-campaign-2',
      advertiser_id: 'demo-advertiser-1',
      name: 'Adventure Seekers Package',
      description: 'Calling all thrill-seekers! Experience the ultimate adventure vacation with guided tours and activities.',
      discount_details: '20% off adventure packages + Free equipment rental',
      images: [
        'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=800',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
      ],
      destination_info: {
        location: 'Costa Rica',
        highlights: ['Zip-lining', 'White water rafting', 'Volcano tours', 'Wildlife safaris']
      },
      tags: ['adventure', 'outdoor', 'nature', 'active'],
      status: 'active',
      impressions: 8921,
      clicks: 567,
      conversions: 23,
      start_date: new Date('2024-07-01').toISOString(),
      end_date: new Date('2024-09-30').toISOString(),
      created_at: new Date('2024-06-20').toISOString(),
      targeting: [
        {
          id: 'demo-targeting-2',
          campaign_id: 'demo-campaign-2',
          interests: ['adventure travel', 'outdoor activities', 'eco-tourism'],
          locations: ['United States', 'Canada', 'Australia'],
          trip_types: ['adventure', 'group travel', 'eco-tourism'],
          created_at: new Date('2024-06-20').toISOString()
        }
      ]
    }
  ];

  useEffect(() => {
    if (isDemoMode) {
      // Load demo data immediately in demo mode
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!advertiser && !isDemoMode) {
    return <AdvertiserOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-purple-600 text-white py-2 px-4 text-center">
          <p className="text-sm font-medium">
            🎭 Demo Mode Active - This is a preview of the Chravel Advertiser Hub
          </p>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Chravel Advertiser Hub
              </h1>
              <span className="text-sm text-gray-500">
                {advertiser?.company_name || 'Loading...'}
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
              {!isDemoMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
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