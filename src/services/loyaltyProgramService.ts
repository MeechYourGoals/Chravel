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

// In-memory storage for loyalty programs (table doesn't exist in Supabase yet)
const loyaltyProgramsStorage = new Map<string, LoyaltyProgram[]>();

export const loyaltyProgramService = {
  async getUserPrograms(userId: string): Promise<LoyaltyProgram[]> {
    // Use in-memory storage since table doesn't exist yet
    return loyaltyProgramsStorage.get(userId) || [];
  },

  async getProgramsByType(userId: string, type: LoyaltyProgramType): Promise<LoyaltyProgram[]> {
    const programs = await this.getUserPrograms(userId);
    return programs.filter(p => p.program_type === type);
  },

  async saveProgram(userId: string, program: Omit<LoyaltyProgram, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<LoyaltyProgram | null> {
    const newProgram: LoyaltyProgram = {
      id: `lp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      user_id: userId,
      ...program,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const userPrograms = loyaltyProgramsStorage.get(userId) || [];
    userPrograms.push(newProgram);
    loyaltyProgramsStorage.set(userId, userPrograms);
    
    return newProgram;
  },

  async updateProgram(programId: string, updates: Partial<LoyaltyProgram>): Promise<boolean> {
    for (const [userId, programs] of loyaltyProgramsStorage.entries()) {
      const index = programs.findIndex(p => p.id === programId);
      if (index !== -1) {
        programs[index] = { ...programs[index], ...updates, updated_at: new Date().toISOString() };
        loyaltyProgramsStorage.set(userId, programs);
        return true;
      }
    }
    return false;
  },

  async deleteProgram(programId: string): Promise<boolean> {
    for (const [userId, programs] of loyaltyProgramsStorage.entries()) {
      const index = programs.findIndex(p => p.id === programId);
      if (index !== -1) {
        programs.splice(index, 1);
        loyaltyProgramsStorage.set(userId, programs);
        return true;
      }
    }
    return false;
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
