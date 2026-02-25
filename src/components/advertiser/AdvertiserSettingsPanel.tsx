import React, { useState, useEffect } from 'react';
import { Plus, BarChart3, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { AdvertiserService } from '@/services/advertiserService';
import { Advertiser, CampaignWithTargeting } from '@/types/advertiser';
import { CampaignList } from './CampaignList';
import { CampaignCreator } from './CampaignCreator';
import { CampaignAnalytics } from './CampaignAnalytics';
import { AdvertiserSettings } from './AdvertiserSettings';
import { useDemoModeStore } from '@/store/demoModeStore';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

interface AdvertiserSettingsPanelProps {
  currentUserId: string;
}

export const AdvertiserSettingsPanel = ({ currentUserId }: AdvertiserSettingsPanelProps) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const isDemoMode = useDemoModeStore(state => state.isDemoMode);
  const { isSuperAdmin } = useSuperAdmin();
  const [activeSection, setActiveSection] = useState('campaigns');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignWithTargeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCampaignCreator, setShowCampaignCreator] = useState(false);

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
      description: 'Flat $10 off airport rides for Chravel users.',
      discount_details: '$10 off airport rides',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800',
          alt: 'Airport terminal',
          order: 0,
        },
      ],
      destination_info: { location: 'Miami, FL' },
      tags: ['rideshare', 'airport-transfer', 'premium-service'],
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
        interests: ['business-travel'],
        locations: ['United States'],
        trip_types: ['business', 'leisure'],
        created_at: new Date('2024-01-01').toISOString(),
        updated_at: new Date('2024-01-01').toISOString(),
      },
    },
    {
      id: 'demo-campaign-hotels',
      advertiser_id: 'demo-advertiser-1',
      name: 'Hotels.com - Compare & Save',
      description: 'Compare hotel prices and earn rewards.',
      discount_details: 'Collect 10 nights, get 1 free',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
          alt: 'Luxury hotel',
          order: 0,
        },
      ],
      destination_info: { location: 'Global Hotel Network' },
      tags: ['lodging', 'price-comparison', 'rewards-program'],
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
        interests: ['hotels', 'travel-planning'],
        locations: ['United States', 'Canada'],
        trip_types: ['leisure', 'business', 'family'],
        created_at: new Date('2024-01-15').toISOString(),
        updated_at: new Date('2024-01-15').toISOString(),
      },
    },
  ];

  const sections = [
    { id: 'campaigns', label: 'Campaigns', icon: Plus },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  useEffect(() => {
    if (isDemoMode) {
      setAdvertiser(mockAdvertiser);
      setCampaigns(mockCampaigns);
      setIsLoading(false);
    } else {
      loadAdvertiserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, isSuperAdmin]);

  const loadAdvertiserData = async () => {
    try {
      setIsLoading(true);
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

  const handleCampaignCreated = async () => {
    setShowCampaignCreator(false);
    await loadAdvertiserData();
  };

  const superAdminAdvertiser: Advertiser = {
    id: 'super-admin-advertiser',
    user_id: user?.id || 'super-admin',
    company_name: 'ChravelApp Admin',
    company_email: user?.email || 'admin@chravel.com',
    website: 'https://chravel.com',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const activeAdvertiser = isDemoMode
    ? mockAdvertiser
    : advertiser || (isSuperAdmin ? superAdminAdvertiser : advertiser);
  const activeCampaigns = isDemoMode ? mockCampaigns : campaigns;

  const renderSection = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    switch (activeSection) {
      case 'campaigns':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Your Campaigns</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {activeAdvertiser?.company_name || 'Create campaigns to advertise on Chravel'}
                </p>
              </div>
              <Button
                onClick={() => setShowCampaignCreator(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
            <CampaignList campaigns={activeCampaigns} onRefresh={loadAdvertiserData} />
          </div>
        );
      case 'analytics':
        return <CampaignAnalytics campaigns={activeCampaigns} />;
      case 'settings':
        return <AdvertiserSettings advertiser={activeAdvertiser} onUpdate={setAdvertiser} />;
      default:
        return null;
    }
  };

  const currentSection = sections.find(s => s.id === activeSection);

  if (isMobile) {
    return (
      <div className="flex flex-col h-full w-full min-w-0">
        {/* Preview Mode Banner */}
        {isPreviewMode && (
          <div className="flex-shrink-0 bg-primary/20 border-b border-primary/30 py-2 px-4 text-center">
            <p className="text-xs font-medium text-primary">
              {isDemoMode ? '🎭 Demo Mode' : '👑 Super Admin Preview'}
            </p>
          </div>
        )}

        {/* Mobile Section Selector */}
        <div className="flex-shrink-0 p-4 border-b border-white/10">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl text-white"
          >
            <div className="flex items-center gap-3">
              {currentSection && <currentSection.icon size={20} className="text-primary" />}
              <span className="text-sm">{currentSection?.label}</span>
            </div>
            <ChevronDown
              size={20}
              className={`text-gray-400 transform transition-transform ${showMobileMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {showMobileMenu && (
            <div className="mt-2 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-primary/20 text-primary'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-sm">{section.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile Content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-4">{renderSection()}</div>
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
  }

  return (
    <div className="flex h-full w-full min-w-0">
      {/* Desktop Sidebar */}
      <div className="w-64 flex-shrink-0 bg-white/5 backdrop-blur-md border-r border-white/10 p-4 overflow-y-auto">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white mb-1">Advertiser Hub</h2>
          <p className="text-xs text-gray-400">
            {activeAdvertiser?.company_name || 'Manage your campaigns'}
          </p>
        </div>

        {/* Preview Mode Indicator */}
        {isPreviewMode && (
          <div className="mb-4 p-2 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-xs font-medium text-primary text-center">
              {isDemoMode ? '🎭 Demo Mode' : '👑 Super Admin'}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Main Content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-6 pb-16">{renderSection()}</div>
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
