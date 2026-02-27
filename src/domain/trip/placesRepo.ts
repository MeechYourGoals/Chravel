import { supabase } from '@/integrations/supabase/client';

export interface TripPlace {
    id: string;
    trip_id: string;
    og_title?: string;
    og_description?: string; // Contains parsed metadata
    url: string;
    domain?: string;
    og_image_url?: string;
}

/**
 * Places Repository (TDAL)
 */
export const placesRepo = {
    async getPlaces(tripId: string): Promise<TripPlace[]> {
        const { data, error } = await supabase
            .from('trip_link_index')
            .select('*')
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // Note: Creating places usually happens via Chat Link parsing or direct save.
    // For now, we expose read access. Write access is often via 'trip_links' table for Basecamp links.
};
