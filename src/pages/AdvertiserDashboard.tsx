import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

export const AdvertiserDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isDemoMode = useDemoModeStore(state => state.isDemoMode);
  const { isSuperAdmin } = useSuperAdmin();
  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignWithTargeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCampaignCreator, setShowCampaignCreator] = useState(false);
  const [selectedTab, setSelectedTab] = useState('campaigns');

  // Super admin gets full demo functionality to showcase the feature
  const isPreviewMode = isDemoMode || isSuperAdmin;

  // Demo mode mock data
  const mockAdvertiser: Advertiser = {
    id: 'demo-advertiser-1',
    user_id: 'demo-user-1',
    company_name: 'Paradise Resorts International',
    company_email: 'marketing@paradiseresorts.com',
    website: 'https://www.paradiseresorts.com',
    status: 'active',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockCampaigns: CampaignWithTargeting[] = [
    {
      id: 'demo-campaign-uber',
      advertiser_id: 'demo-advertiser-1',
      name: 'Uber - Premium Airport Rides',
      description:
        'Flat $10 off airport rides for Chravel users. Choose from Uber Comfort or Uber Black for luxury travel.',
      discount_details: '$10 off airport rides',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800',
          alt: 'Airport terminal',
          order: 0,
        },
        {
          url: 'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=800',
          alt: 'Luxury car interior',
          order: 1,
        },
        {
          url: 'https://images.unsplash.com/photo-1606768666853-403c90a981ad?w=800',
          alt: 'City skyline',
          order: 2,
        },
      ],
      destination_info: {
        location: 'Miami, FL',
      },
      tags: ['rideshare', 'airport-transfer', 'premium-service', 'city-travel'],
      status: 'active',
      impressions: 15234,
      clicks: 1203,
      saves: 342,
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
        updated_at: new Date('2024-01-01').toISOString(),
      },
    },
    {
      id: 'demo-campaign-lyft',
      advertiser_id: 'demo-advertiser-1',
      name: 'Lyft - Reliable City Rides',
      description:
        'Safe, friendly rides when you need them. New user discount for Chravel members available citywide.',
      discount_details: 'New user discount for Chravel',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800',
          alt: 'City street view',
          order: 0,
        },
        {
          url: 'https://images.unsplash.com/photo-1502489597346-dad15683d4c2?w=800',
          alt: 'Happy passenger',
          order: 1,
        },
      ],
      destination_info: {
        location: 'Major Cities Nationwide',
      },
      tags: ['rideshare', 'city-travel', 'new-user-offer', 'budget-friendly'],
      status: 'active',
      impressions: 12876,
      clicks: 945,
      saves: 287,
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
        updated_at: new Date('2024-02-01').toISOString(),
      },
    },
    {
      id: 'demo-campaign-hotels',
      advertiser_id: 'demo-advertiser-1',
      name: 'Hotels.com - Compare & Save',
      description:
        'Compare hotel prices and earn rewards. Get one night free for every 10 nights booked.',
      discount_details: 'Collect 10 nights, get 1 free',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
          alt: 'Luxury hotel exterior',
          order: 0,
        },
        {
          url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
          alt: 'Hotel pool view',
          order: 1,
        },
        {
          url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
          alt: 'Comfortable hotel room',
          order: 2,
        },
      ],
      destination_info: {
        location: 'Global Hotel Network',
      },
      tags: ['lodging', 'price-comparison', 'rewards-program', 'travel-booking'],
      status: 'active',
      impressions: 18765,
      clicks: 1456,
      saves: 523,
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
        updated_at: new Date('2024-01-15').toISOString(),
      },
    },
  ];

  useEffect(() => {
    if (isDemoMode) {
      // In demo mode, use mock data for demonstration
      setAdvertiser(mockAdvertiser);
      setCampaigns(mockCampaigns);
      setIsLoading(false);
    } else if (isSuperAdmin) {
      // Super admin gets real data - full functionality without mock data
      loadAdvertiserData();
    } else {
      loadAdvertiserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, isSuperAdmin]);

  const loadAdvertiserData = async () => {
    try {
      setIsLoading(true);
      // Use getOrCreateAdvertiserProfile for super admin to auto-create profile
      const profile = isSuperAdmin
        ? await AdvertiserService.getOrCreateAdvertiserProfile()
        : await AdvertiserService.getAdvertiserProfile();
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show onboarding for regular users without an advertiser profile
  // Skip onboarding for demo mode (mock data) and super admin (they can create directly)
  if (!isDemoMode && !isSuperAdmin && !advertiser) {
    return <AdvertiserOnboarding onComplete={handleOnboardingComplete} />;
  }

  // For super admin without an advertiser profile, create a default one
  const superAdminAdvertiser: Advertiser = {
    id: 'super-admin-advertiser',
    user_id: user?.id || 'super-admin',
    company_name: 'Chravel Admin',
    company_email: user?.email || 'admin@chravel.com',
    website: 'https://chravel.com',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Determine active advertiser and campaigns based on mode
  // Demo mode: always use mock data
  // Super admin: use real data (empty campaigns to start fresh)
  // Regular users: use real data
  const activeAdvertiser = isDemoMode
    ? mockAdvertiser
    : advertiser || (isSuperAdmin ? superAdminAdvertiser : advertiser);
  const activeCampaigns = isDemoMode ? mockCampaigns : campaigns;

  return (
    <div className="min-h-screen bg-black">
      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="bg-gradient-to-r from-primary to-amber-500 text-primary-foreground py-2 px-4 text-center">
          <p className="text-sm font-medium">
            {isDemoMode
              ? '🎭 Demo Mode Active - This is a preview of the Chravel Advertiser Hub'
              : '👑 Super Admin Preview - Full access to Chravel Advertiser Hub'}
          </p>
        </div>
      )}

      {/* Header - Mobile Optimized */}
      <header className="bg-black border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 tablet:px-6 lg:px-8 py-4 tablet:py-0">
          <div className="flex flex-col tablet:flex-row tablet:justify-between tablet:items-center gap-3 tablet:h-16">
            {/* Title and company name - stacked on mobile */}
            <div className="flex flex-col tablet:flex-row tablet:items-center gap-1 tablet:gap-4">
              <h1 className="text-xl tablet:text-2xl font-bold text-white">Advertiser Hub</h1>
              <span className="text-sm text-muted-foreground">
                {activeAdvertiser?.company_name || 'Loading...'}
              </span>
            </div>
            {/* Buttons - full width on mobile */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="border-white/10 text-gray-300 hover:bg-white/5 flex-1 tablet:flex-none text-xs tablet:text-sm"
              >
                Back to Chravel
              </Button>
              {!isDemoMode && user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-gray-300 hover:bg-white/5 flex-1 tablet:flex-none text-xs tablet:text-sm"
                >
                  <LogOut className="h-4 w-4 mr-1 tablet:mr-2" />
                  <span className="tablet:inline">Sign Out</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          {/* Centered Tabs */}
          <div className="flex justify-center mb-8">
            <TabsList className="bg-white/5 border border-white/10 p-1">
              <TabsTrigger
                value="campaigns"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                Campaigns
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="campaigns" className="space-y-6 mobile-safe-scroll overflow-y-auto">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Your Campaigns</h2>
              <div className="flex justify-start">
                <Button
                  onClick={() => setShowCampaignCreator(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            </div>

            <CampaignList campaigns={activeCampaigns} onRefresh={loadAdvertiserData} />
          </TabsContent>

          <TabsContent value="analytics" className="mobile-safe-scroll overflow-y-auto">
            <CampaignAnalytics campaigns={activeCampaigns} />
          </TabsContent>

          <TabsContent value="settings" className="mobile-safe-scroll overflow-y-auto">
            <AdvertiserSettings advertiser={activeAdvertiser} onUpdate={setAdvertiser} />
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
