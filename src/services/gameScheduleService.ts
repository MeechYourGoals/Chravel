import { supabase } from '@/integrations/supabase/client';

export interface GameSchedule {
  id: string;
  organization_id: string;
  trip_id?: string;
  opponent: string;
  venue: string;
  venue_address?: string;
  game_date: string;
  game_time: string;
  load_in_time?: string;
  is_home: boolean;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const gameScheduleService = {
  async list(organizationId: string): Promise<GameSchedule[]> {
    const { data, error } = await supabase
      .from('game_schedules')
      .select('*')
      .eq('organization_id', organizationId)
      .order('game_date', { ascending: true });

    if (error) throw error;
    return (data as GameSchedule[]) || [];
  },

  async create(
    game: Omit<GameSchedule, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<GameSchedule> {
    const { data, error } = await supabase.from('game_schedules').insert(game).select().single();

    if (error) throw error;
    return data as GameSchedule;
  },

  async update(id: string, updates: Partial<GameSchedule>): Promise<GameSchedule> {
    const { data, error } = await supabase
      .from('game_schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as GameSchedule;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('game_schedules').delete().eq('id', id);

    if (error) throw error;
  },

  async bulkCreate(
    games: Omit<GameSchedule, 'id' | 'created_at' | 'updated_at'>[],
  ): Promise<GameSchedule[]> {
    const { data, error } = await supabase.from('game_schedules').insert(games).select();

    if (error) throw error;
    return data as GameSchedule[];
  },
};
