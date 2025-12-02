import { supabase } from '@/integrations/supabase/client';
import { AirlineProgram, HotelProgram, RentalCarProgram } from '../types/pro';

export type LoyaltyProgramType = 'airline' | 'hotel' | 'rental';

export interface LoyaltyProgram {
  id: string;
  user_id: string;
  program_type: LoyaltyProgramType;
  company_name: string;
  program_name: string;
  membership_number: string;
  tier?: string;
  is_preferred: boolean;
  created_at?: string;
  updated_at?: string;
}

export const loyaltyProgramService = {
  async getUserPrograms(userId: string): Promise<LoyaltyProgram[]> {
    try {
      const { data, error } = await supabase
        .from('user_loyalty_programs')
        .select('*')
        .eq('user_id', userId)
        .order('is_preferred', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet - return empty array
        console.error('Error fetching loyalty programs:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching loyalty programs:', error);
      return [];
    }
  },

  async getProgramsByType(userId: string, type: LoyaltyProgramType): Promise<LoyaltyProgram[]> {
    const programs = await this.getUserPrograms(userId);
    return programs.filter(p => p.program_type === type);
  },

  async saveProgram(userId: string, program: Omit<LoyaltyProgram, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<LoyaltyProgram | null> {
    try {
      const { data, error } = await supabase
        .from('user_loyalty_programs')
        .insert({
          user_id: userId,
          program_type: program.program_type,
          company_name: program.company_name,
          program_name: program.program_name,
          membership_number: program.membership_number,
          tier: program.tier,
          is_preferred: program.is_preferred
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving loyalty program:', error);
      return null;
    }
  },

  async updateProgram(programId: string, updates: Partial<LoyaltyProgram>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_loyalty_programs')
        .update({
          company_name: updates.company_name,
          program_name: updates.program_name,
          membership_number: updates.membership_number,
          tier: updates.tier,
          is_preferred: updates.is_preferred
        })
        .eq('id', programId);

      return !error;
    } catch (error) {
      console.error('Error updating loyalty program:', error);
      return false;
    }
  },

  async deleteProgram(programId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_loyalty_programs')
        .delete()
        .eq('id', programId);

      return !error;
    } catch (error) {
      console.error('Error deleting loyalty program:', error);
      return false;
    }
  },

  // Helper functions to convert to legacy types
  toAirlineProgram(program: LoyaltyProgram): AirlineProgram {
    return {
      id: program.id,
      airline: program.company_name,
      programName: program.program_name,
      membershipNumber: program.membership_number,
      tier: program.tier,
      isPreferred: program.is_preferred
    };
  },

  toHotelProgram(program: LoyaltyProgram): HotelProgram {
    return {
      id: program.id,
      hotelChain: program.company_name,
      programName: program.program_name,
      membershipNumber: program.membership_number,
      tier: program.tier,
      isPreferred: program.is_preferred
    };
  },

  toRentalCarProgram(program: LoyaltyProgram): RentalCarProgram {
    return {
      id: program.id,
      company: program.company_name,
      programName: program.program_name,
      membershipNumber: program.membership_number,
      tier: program.tier,
      isPreferred: program.is_preferred
    };
  }
};
