import { supabase } from '@/integrations/supabase/client';

export interface ShowSchedule {
  id: string;
  organization_id: string;
  trip_id?: string;
  title: string;
  venue: string;
  venue_address?: string;
  show_date: string;
  show_time: string;
  soundcheck_time?: string;
  load_in_time?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const showScheduleService = {
  async list(organizationId: string): Promise<ShowSchedule[]> {
    const { data, error } = await supabase
      .from('show_schedules')
      .select('*')
      .eq('organization_id', organizationId)
      .order('show_date', { ascending: true });

    if (error) throw error;
    return (data as ShowSchedule[]) || [];
  },

  async create(
    show: Omit<ShowSchedule, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<ShowSchedule> {
    const { data, error } = await supabase.from('show_schedules').insert(show).select().single();

    if (error) throw error;
    return data as ShowSchedule;
  },

  async update(id: string, updates: Partial<ShowSchedule>): Promise<ShowSchedule> {
    const { data, error } = await supabase
      .from('show_schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ShowSchedule;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('show_schedules').delete().eq('id', id);

    if (error) throw error;
  },

  async bulkCreate(
    shows: Omit<ShowSchedule, 'id' | 'created_at' | 'updated_at'>[],
  ): Promise<ShowSchedule[]> {
    const { data, error } = await supabase.from('show_schedules').insert(shows).select();

    if (error) throw error;
    return data as ShowSchedule[];
  },
};
