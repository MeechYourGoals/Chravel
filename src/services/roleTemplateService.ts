import { supabase } from '../integrations/supabase/client';
import { ProParticipant } from '../types/pro';
import { ProTripCategory } from '../types/proCategories';

export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  category: ProTripCategory;
  roles: { role: string; count: number; credentialLevel?: string }[];
  createdBy: string;
  organizationId?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleTemplateCreateRequest {
  name: string;
  description?: string;
  category: ProTripCategory;
  roster: ProParticipant[];
  isPublic?: boolean;
  organizationId?: string;
}

class RoleTemplateService {
  /**
   * Save current roster as a template
   */
  async saveTemplate(request: RoleTemplateCreateRequest): Promise<RoleTemplate | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Aggregate roles from roster
      const roleMap = new Map<string, { count: number; credentialLevel?: string }>();
      request.roster.forEach(member => {
        const existing = roleMap.get(member.role);
        if (existing) {
          existing.count++;
        } else {
          roleMap.set(member.role, {
            count: 1,
            credentialLevel: member.credentialLevel
          });
        }
      });

      const roles = Array.from(roleMap.entries()).map(([role, data]) => ({
        role,
        count: data.count,
        credentialLevel: data.credentialLevel
      }));

      const { data, error } = await (supabase as any)
        .from('role_templates')
        .insert({
          name: request.name,
          description: request.description,
          category: request.category,
          roles: roles,
          created_by: user.id,
          organization_id: request.organizationId,
          is_public: request.isPublic || false
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: (data as any).id,
        name: (data as any).name,
        description: (data as any).description,
        category: (data as any).category,
        roles: (data as any).roles,
        createdBy: (data as any).created_by,
        organizationId: (data as any).organization_id,
        isPublic: (data as any).is_public,
        createdAt: (data as any).created_at,
        updatedAt: (data as any).updated_at
      };
    } catch (error) {
      console.error('Failed to save template:', error);
      return null;
    }
  }

  /**
   * Load a template by ID
   */
  async loadTemplate(templateId: string): Promise<RoleTemplate | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('role_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      return {
        id: (data as any).id,
        name: (data as any).name,
        description: (data as any).description,
        category: (data as any).category,
        roles: (data as any).roles,
        createdBy: (data as any).created_by,
        organizationId: (data as any).organization_id,
        isPublic: (data as any).is_public,
        createdAt: (data as any).created_at,
        updatedAt: (data as any).updated_at
      };
    } catch (error) {
      console.error('Failed to load template:', error);
      return null;
    }
  }

  /**
   * Get all templates for current user
   */
  async getUserTemplates(): Promise<RoleTemplate[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from('role_templates')
        .select('*')
        .or(`created_by.eq.${user.id},is_public.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        category: d.category,
        roles: d.roles,
        createdBy: d.created_by,
        organizationId: d.organization_id,
        isPublic: d.is_public,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }));
    } catch (error) {
      console.error('Failed to get user templates:', error);
      return [];
    }
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: ProTripCategory): Promise<RoleTemplate[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from('role_templates')
        .select('*')
        .eq('category', category)
        .or(`created_by.eq.${user.id},is_public.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        category: d.category,
        roles: d.roles,
        createdBy: d.created_by,
        organizationId: d.organization_id,
        isPublic: d.is_public,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }));
    } catch (error) {
      console.error('Failed to get templates by category:', error);
      return [];
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .from('role_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to delete template:', error);
      return false;
    }
  }

  /**
   * Update a template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<Pick<RoleTemplate, 'name' | 'description' | 'isPublic'>>
  ): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .from('role_templates')
        .update({
          name: updates.name,
          description: updates.description,
          is_public: updates.isPublic
        })
        .eq('id', templateId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to update template:', error);
      return false;
    }
  }

  /**
   * Apply a template to current roster
   * Returns a map of member IDs to suggested roles
   */
  applyTemplateToRoster(
    template: RoleTemplate,
    currentRoster: ProParticipant[]
  ): Map<string, string> {
    const assignments = new Map<string, string>();
    const templateRoles = template.roles.map(r => r.role);
    let roleIndex = 0;

    // Simple assignment: distribute template roles across roster
    // In a real implementation, this could use AI to match based on names/skills
    currentRoster.forEach(member => {
      if (roleIndex < templateRoles.length) {
        assignments.set(member.id, templateRoles[roleIndex]);
        roleIndex++;
        // Loop back if more members than roles
        if (roleIndex >= templateRoles.length) roleIndex = 0;
      }
    });

    return assignments;
  }
}

export const roleTemplateService = new RoleTemplateService();

