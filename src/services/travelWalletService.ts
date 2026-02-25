import { supabase } from '@/integrations/supabase/client';

export interface LoyaltyProgram {
  id: string;
  user_id: string;
  program_name: string;
  membership_number: string;
  tier?: string;
  is_preferred: boolean;
  created_at: string;
  updated_at: string;
}

export interface AirlineProgram extends LoyaltyProgram {
  airline: string;
}

export interface HotelProgram extends LoyaltyProgram {
  hotel_chain: string;
}

export interface RentalProgram extends LoyaltyProgram {
  company: string;
}

export const travelWalletService = {
  // Airlines
  async listAirlines(userId: string): Promise<AirlineProgram[]> {
    const { data, error } = await supabase
      .from('loyalty_airlines')
      .select('*')
      .eq('user_id', userId)
      .order('is_preferred', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addAirline(
    userId: string,
    program: Omit<AirlineProgram, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
  ): Promise<AirlineProgram> {
    const { data, error } = await supabase
      .from('loyalty_airlines')
      .insert({ user_id: userId, ...program })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAirline(id: string, updates: Partial<AirlineProgram>): Promise<AirlineProgram> {
    const { data, error } = await supabase
      .from('loyalty_airlines')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAirline(id: string): Promise<void> {
    const { error } = await supabase.from('loyalty_airlines').delete().eq('id', id);

    if (error) throw error;
  },

  // Hotels
  async listHotels(userId: string): Promise<HotelProgram[]> {
    const { data, error } = await supabase
      .from('loyalty_hotels')
      .select('*')
      .eq('user_id', userId)
      .order('is_preferred', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addHotel(
    userId: string,
    program: Omit<HotelProgram, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
  ): Promise<HotelProgram> {
    const { data, error } = await supabase
      .from('loyalty_hotels')
      .insert({ user_id: userId, ...program })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateHotel(id: string, updates: Partial<HotelProgram>): Promise<HotelProgram> {
    const { data, error } = await supabase
      .from('loyalty_hotels')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteHotel(id: string): Promise<void> {
    const { error } = await supabase.from('loyalty_hotels').delete().eq('id', id);

    if (error) throw error;
  },

  // Rentals
  async listRentals(userId: string): Promise<RentalProgram[]> {
    const { data, error } = await supabase
      .from('loyalty_rentals')
      .select('*')
      .eq('user_id', userId)
      .order('is_preferred', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addRental(
    userId: string,
    program: Omit<RentalProgram, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
  ): Promise<RentalProgram> {
    const { data, error } = await supabase
      .from('loyalty_rentals')
      .insert({ user_id: userId, ...program })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateRental(id: string, updates: Partial<RentalProgram>): Promise<RentalProgram> {
    const { data, error } = await supabase
      .from('loyalty_rentals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteRental(id: string): Promise<void> {
    const { error } = await supabase.from('loyalty_rentals').delete().eq('id', id);

    if (error) throw error;
  },
};
