import { supabase } from '../integrations/supabase/client';
import { 
  Advertiser, 
  Campaign, 
  CampaignTargeting, 
  CampaignAnalytics,
  CampaignFormData,
  CampaignWithTargeting,
  CampaignStats 
} from '../types/advertiser';
import { useDemoModeStore } from '../store/demoModeStore';

export class AdvertiserService {
  // Advertiser Management
  static async getAdvertiserProfile(): Promise<Advertiser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('advertisers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as unknown as Advertiser | null;
    } catch (error) {
      console.error('Error fetching advertiser profile:', error);
      return null;
    }
  }

  static async createAdvertiserProfile(profile: {
    company_name: string;
    company_email: string;
    website?: string;
  }): Promise<Advertiser | null> {
    try {
      const isDemoMode = useDemoModeStore.getState().isDemoMode;
      
      if (isDemoMode) {
        // Return mock advertiser in demo mode
        return {
          id: 'demo-advertiser-' + Date.now(),
          user_id: 'demo-user',
          company_name: profile.company_name,
          company_email: profile.company_email,
          website: profile.website,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('advertisers')
        .insert({
          user_id: user.id,
          ...profile
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Advertiser;
    } catch (error) {
      console.error('Error creating advertiser profile:', error);
      throw error;
    }
  }

  // Campaign Management
  static async getCampaigns(): Promise<CampaignWithTargeting[]> {
    try {
      const advertiser = await this.getAdvertiserProfile();
      if (!advertiser) return [];

      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          targeting:campaign_targeting(*)
        `)
        .eq('advertiser_id', advertiser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as CampaignWithTargeting[];
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }
  }

  static async getCampaign(campaignId: string): Promise<CampaignWithTargeting | null> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          targeting:campaign_targeting(*)
        `)
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      return data as unknown as CampaignWithTargeting | null;
    } catch (error) {
      console.error('Error fetching campaign:', error);
      return null;
    }
  }

  static async createCampaign(formData: CampaignFormData): Promise<Campaign | null> {
    try {
      const advertiser = await this.getAdvertiserProfile();
      if (!advertiser) throw new Error('No advertiser profile found');

      // Start a transaction
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          advertiser_id: advertiser.id,
          name: formData.name,
          description: formData.description,
          discount_details: formData.discount_details,
          images: formData.images as any,
          destination_info: formData.destination_info as any,
          tags: formData.tags,
          status: formData.status,
          start_date: formData.start_date,
          end_date: formData.end_date
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create targeting data
      if (campaign && formData.targeting) {
        const { error: targetingError } = await supabase
          .from('campaign_targeting')
          .insert({
            campaign_id: campaign.id,
            ...formData.targeting
          });

        if (targetingError) {
          // Rollback by deleting campaign
          await supabase.from('campaigns').delete().eq('id', campaign.id);
          throw targetingError;
        }
      }

      return campaign as unknown as Campaign;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  static async updateCampaign(
    campaignId: string, 
    updates: Partial<CampaignFormData>
  ): Promise<Campaign | null> {
    try {
      const { targeting, ...campaignUpdates } = updates;

      // Update campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .update(campaignUpdates as any)
        .eq('id', campaignId)
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Update targeting if provided
      if (targeting) {
        const { error: targetingError } = await supabase
          .from('campaign_targeting')
          .upsert({
            campaign_id: campaignId,
            ...targeting
          });

        if (targetingError) throw targetingError;
      }

      return campaign as unknown as Campaign;
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  }

  static async deleteCampaign(campaignId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting campaign:', error);
      return false;
    }
  }

  // Campaign Status Management
  static async updateCampaignStatus(
    campaignId: string, 
    status: Campaign['status']
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status })
        .eq('id', campaignId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating campaign status:', error);
      return false;
    }
  }

  // Analytics
  static async getCampaignStats(campaignId: string): Promise<CampaignStats | null> {
    try {
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) return null;

      const stats: CampaignStats = {
        impressions: campaign.impressions || 0,
        clicks: campaign.clicks || 0,
        conversions: campaign.conversions || 0,
        ctr: campaign.impressions > 0 
          ? (campaign.clicks / campaign.impressions) * 100 
          : 0,
        conversionRate: campaign.clicks > 0 
          ? (campaign.conversions / campaign.clicks) * 100 
          : 0
      };

      return stats;
    } catch (error) {
      console.error('Error fetching campaign stats:', error);
      return null;
    }
  }

  static async trackEvent(
    campaignId: string, 
    eventType: CampaignAnalytics['event_type'],
    eventData?: Record<string, any>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Insert analytics event
      await supabase
        .from('campaign_analytics')
        .insert({
          campaign_id: campaignId,
          user_id: user?.id,
          event_type: eventType,
          event_data: eventData
        });

      // Increment campaign stats
      await supabase.rpc('increment_campaign_stat', {
        p_campaign_id: campaignId,
        p_stat_type: eventType
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  // Get active campaigns for display
  static async getActiveCampaigns(
    filters?: {
      interests?: string[];
      location?: string;
      trip_type?: string;
    }
  ): Promise<CampaignWithTargeting[]> {
    try {
      const query = supabase
        .from('campaigns')
        .select(`
          *,
          targeting:campaign_targeting(*)
        `)
        .eq('status', 'active')
        .or(`start_date.is.null,start_date.lte.${new Date().toISOString()}`)
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`);

      const { data, error } = await query;
      if (error) throw error;

      // Client-side filtering based on targeting
      let filteredCampaigns = data || [];
      
      if (filters) {
        filteredCampaigns = filteredCampaigns.filter(campaign => {
          const targeting = campaign.targeting;
          if (!targeting) return true;

          // Check interests
          if (filters.interests?.length && targeting.interests?.length) {
            const hasMatchingInterest = filters.interests.some(interest => 
              targeting.interests.includes(interest)
            );
            if (!hasMatchingInterest) return false;
          }

          // Check location
          if (filters.location && targeting.locations?.length) {
            if (!targeting.locations.includes(filters.location)) return false;
          }

          // Check trip type
          if (filters.trip_type && targeting.trip_types?.length) {
            if (!targeting.trip_types.includes(filters.trip_type)) return false;
          }

          return true;
        });
      }

      return filteredCampaigns as unknown as CampaignWithTargeting[];
    } catch (error) {
      console.error('Error fetching active campaigns:', error);
      return [];
    }
  }

  // Image upload helper
  static async uploadCampaignImage(file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `campaign-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('advertiser-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('advertiser-assets')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }
}