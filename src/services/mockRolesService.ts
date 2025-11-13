import { TripRole } from '@/types/roleChannels';
import { TripChannel } from '@/types/roleChannels';
import { FeaturePermissions } from '@/types/roleChannels';

export class MockRolesService {
  private static readonly MOCK_ROLES_KEY = 'demo_pro_trip_roles';
  private static readonly MOCK_CHANNELS_KEY = 'demo_pro_trip_channels';
  private static readonly MOCK_ASSIGNMENTS_KEY = 'demo_pro_trip_assignments';

  // Default roles for Sports Pro trips
  private static readonly SPORTS_ROLES = [
    { name: 'Head Coach', permissionLevel: 'admin', description: 'Team leadership and strategy' },
    { name: 'Assistant Coach', permissionLevel: 'edit', description: 'Coaching support staff' },
    { name: 'Players', permissionLevel: 'edit', description: 'Team roster' },
    { name: 'Medical Staff', permissionLevel: 'view', description: 'Trainers and doctors' },
    { name: 'Team Operations', permissionLevel: 'view', description: 'Logistics and coordination' },
  ];

  // Default roles for Entertainment Tour trips
  private static readonly TOUR_ROLES = [
    { name: 'Tour Manager', permissionLevel: 'admin', description: 'Overall tour coordination' },
    { name: 'Production Manager', permissionLevel: 'edit', description: 'Technical production' },
    { name: 'Crew', permissionLevel: 'view', description: 'Stage and technical crew' },
    { name: 'Security', permissionLevel: 'view', description: 'Security personnel' },
    { name: 'VIP Liaison', permissionLevel: 'view', description: 'Guest coordination' },
  ];

  // Default roles for Corporate Retreats
  private static readonly CORPORATE_ROLES = [
    { name: 'Event Coordinator', permissionLevel: 'admin', description: 'Event planning and execution' },
    { name: 'Team Lead', permissionLevel: 'edit', description: 'Department heads' },
    { name: 'Attendees', permissionLevel: 'view', description: 'Event participants' },
    { name: 'Facilitators', permissionLevel: 'edit', description: 'Workshop leaders' },
    { name: 'Support Staff', permissionLevel: 'view', description: 'Administrative support' },
  ];

  static getRolesForCategory(category: string): typeof this.SPORTS_ROLES {
    const cat = category.toLowerCase();
    if (cat.includes('sport') || cat.includes('team') || cat.includes('athlet')) return this.SPORTS_ROLES;
    if (cat.includes('tour') || cat.includes('music') || cat.includes('concert')) return this.TOUR_ROLES;
    if (cat.includes('corporate') || cat.includes('retreat') || cat.includes('conference')) return this.CORPORATE_ROLES;
    return this.SPORTS_ROLES; // Default fallback
  }

  static seedRolesForTrip(tripId: string, category: string, currentUserId: string): TripRole[] {
    const roleTemplates = this.getRolesForCategory(category);
    
    const roles: TripRole[] = roleTemplates.map((template, index) => ({
      id: `mock-role-${tripId}-${index}`,
      tripId,
      roleName: template.name,
      description: template.description,
      permissionLevel: template.permissionLevel as any,
      featurePermissions: this.getDefaultFeaturePermissions(template.permissionLevel as any),
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memberCount: 0,
    }));

    // Store in localStorage for persistence
    const allRoles = this.getAllRoles();
    allRoles[tripId] = roles;
    localStorage.setItem(this.MOCK_ROLES_KEY, JSON.stringify(allRoles));

    return roles;
  }

  static seedChannelsForRoles(tripId: string, roles: TripRole[], currentUserId: string): TripChannel[] {
    const channels: TripChannel[] = roles.map((role, index) => ({
      id: `mock-channel-${tripId}-${index}`,
      tripId,
      channelName: `#${role.roleName.toLowerCase().replace(/\s+/g, '-')}`,
      channelSlug: role.roleName.toLowerCase().replace(/\s+/g, '-'),
      description: `Private channel for ${role.roleName} only`,
      isPrivate: true,
      isArchived: false,
      requiredRoleId: role.id,
      requiredRoleName: role.roleName,
      memberCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUserId,
    }));

    // Store in localStorage
    const allChannels = this.getAllChannels();
    allChannels[tripId] = channels;
    localStorage.setItem(this.MOCK_CHANNELS_KEY, JSON.stringify(allChannels));

    return channels;
  }

  static getRolesForTrip(tripId: string): TripRole[] | null {
    const allRoles = this.getAllRoles();
    return allRoles[tripId] || null;
  }

  static getChannelsForTrip(tripId: string): TripChannel[] | null {
    const allChannels = this.getAllChannels();
    return allChannels[tripId] || null;
  }

  private static getAllRoles(): Record<string, TripRole[]> {
    const stored = localStorage.getItem(this.MOCK_ROLES_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  private static getAllChannels(): Record<string, TripChannel[]> {
    const stored = localStorage.getItem(this.MOCK_CHANNELS_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  private static getDefaultFeaturePermissions(level: string): FeaturePermissions {
    if (level === 'admin') {
      return {
        channels: { can_view: true, can_post: true, can_edit_messages: true, can_delete_messages: true, can_manage_members: true },
        calendar: { can_view: true, can_create_events: true, can_edit_events: true, can_delete_events: true },
        tasks: { can_view: true, can_create: true, can_assign: true, can_complete: true, can_delete: true },
        media: { can_view: true, can_upload: true, can_delete_own: true, can_delete_any: true },
        payments: { can_view: true, can_create: true, can_approve: true },
      };
    }
    
    if (level === 'edit') {
      return {
        channels: { can_view: true, can_post: true, can_edit_messages: false, can_delete_messages: false, can_manage_members: false },
        calendar: { can_view: true, can_create_events: true, can_edit_events: false, can_delete_events: false },
        tasks: { can_view: true, can_create: true, can_assign: false, can_complete: true, can_delete: false },
        media: { can_view: true, can_upload: true, can_delete_own: true, can_delete_any: false },
        payments: { can_view: true, can_create: false, can_approve: false },
      };
    }

    // view level
    return {
      channels: { can_view: true, can_post: false, can_edit_messages: false, can_delete_messages: false, can_manage_members: false },
      calendar: { can_view: true, can_create_events: false, can_edit_events: false, can_delete_events: false },
      tasks: { can_view: true, can_create: false, can_assign: false, can_complete: true, can_delete: false },
      media: { can_view: true, can_upload: false, can_delete_own: false, can_delete_any: false },
      payments: { can_view: true, can_create: false, can_approve: false },
    };
  }

  static clearMockData(tripId?: string) {
    if (tripId) {
      const roles = this.getAllRoles();
      const channels = this.getAllChannels();
      delete roles[tripId];
      delete channels[tripId];
      localStorage.setItem(this.MOCK_ROLES_KEY, JSON.stringify(roles));
      localStorage.setItem(this.MOCK_CHANNELS_KEY, JSON.stringify(channels));
    } else {
      localStorage.removeItem(this.MOCK_ROLES_KEY);
      localStorage.removeItem(this.MOCK_CHANNELS_KEY);
      localStorage.removeItem(this.MOCK_ASSIGNMENTS_KEY);
    }
  }
}
