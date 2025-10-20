import { supabase } from '@/integrations/supabase/client';

export type Advertiser = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  company?: string | null;
  website_url?: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type AdImage = { url: string; alt?: string | null };

export type AdCampaign = {
  id: string;
  advertiser_id: string;
  name: string;
  description?: string | null;
  discount?: string | null;
  images: AdImage[];
  start_date?: string | null;
  end_date?: string | null;
  status: 'draft' | 'active' | 'paused' | 'archived';
  created_at: string;
  updated_at: string;
};

export const advertiserService = {
  // Ensure an advertiser row exists for current user
  ensureProfile: async (params: { name: string; email: string; company?: string; website_url?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existing, error: fetchErr } = await supabase
      .from('advertisers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;
    if (existing) return existing as Advertiser;

    const { data, error } = await supabase
      .from('advertisers')
      .insert({
        user_id: user.id,
        name: params.name,
        email: params.email,
        company: params.company ?? null,
        website_url: params.website_url ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as Advertiser;
  },

  listCampaigns: async (): Promise<AdCampaign[]> => {
    const { data, error } = await supabase
      .from('ad_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as AdCampaign[]) || [];
  },

  createCampaign: async (payload: Omit<AdCampaign, 'id' | 'created_at' | 'updated_at' | 'advertiser_id' | 'status'> & { status?: AdCampaign['status'] }) => {
    const { data: profile, error: profileErr } = await supabase
      .from('advertisers')
      .select('id')
      .limit(1)
      .single();
    if (profileErr) throw profileErr;

    const { data, error } = await supabase
      .from('ad_campaigns')
      .insert({
        advertiser_id: profile.id,
        name: payload.name,
        description: payload.description ?? null,
        discount: payload.discount ?? null,
        images: payload.images ?? [],
        start_date: payload.start_date ?? null,
        end_date: payload.end_date ?? null,
        status: (payload as any).status ?? 'draft',
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as AdCampaign;
  },

  updateCampaign: async (id: string, updates: Partial<Omit<AdCampaign, 'id' | 'advertiser_id' | 'created_at' | 'updated_at'>>) => {
    const { data, error } = await supabase
      .from('ad_campaigns')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as AdCampaign;
  },

  deleteCampaign: async (id: string) => {
    const { error } = await supabase
      .from('ad_campaigns')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
