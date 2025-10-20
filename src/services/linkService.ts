import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];

export async function insertLinkIndex(params: {
  tripId: string;
  url: string;
  ogTitle?: string | null;
  ogImageUrl?: string | null;
  ogDescription?: string | null;
  domain?: string | null;
}) {
  const { data, error } = await supabase
    .from<'trip_link_index', Tables['trip_link_index']['Insert']>('trip_link_index')
    .insert({
      trip_id: params.tripId,
      url: params.url,
      domain: params.domain ?? new URL(params.url).hostname,
      og_title: params.ogTitle ?? null,
      og_image_url: params.ogImageUrl ?? null,
      og_description: params.ogDescription ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
