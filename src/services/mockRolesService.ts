import { TripRole } from '@/types/roleChannels';
import { TripChannel } from '@/types/roleChannels';
import { FeaturePermissions } from '@/types/roleChannels';

export class MockRolesService {
  private static readonly MOCK_ROLES_KEY = 'demo_pro_trip_roles';
  private static readonly MOCK_CHANNELS_KEY = 'demo_pro_trip_channels';
  private static readonly MOCK_ASSIGNMENTS_KEY = 'demo_pro_trip_assignments';

  // NOTE: Predetermined/default roles have been removed per global design decision.
  // For Pro Trips (and Demo Trips that simulate Pro behavior):
  // - There should be no predetermined role sets
  // - No role creation based on trip category or trip type
  // - Roles are user-created, trip-scoped, and fully custom
  // Users create roles manually using "Create Role" button.

  /**
   * Gets existing roles for a trip from localStorage.
   * No longer seeds predetermined roles - trips start with no roles.
   * @deprecated Use getRolesForTrip instead. This method now returns existing roles only.
   */
  static seedRolesForTrip(tripId: string, _category: string, _currentUserId: string): TripRole[] {
    // Return existing roles if any, otherwise return empty array
    // No automatic role seeding based on category
    const existingRoles = this.getRolesForTrip(tripId);
    if (existingRoles) {
      return existingRoles;
    }

    // Initialize empty roles array for this trip
    const allRoles = this.getAllRoles();
    allRoles[tripId] = [];
    localStorage.setItem(this.MOCK_ROLES_KEY, JSON.stringify(allRoles));

    return [];
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

  /**
   * Creates a new role for a trip in demo mode.
   * This is the proper way to add roles - users create them manually.
   */
  static createRole(
    tripId: string,
    roleName: string,
    description: string,
    permissionLevel: 'admin' | 'edit' | 'view',
    currentUserId: string
  ): TripRole {
    const allRoles = this.getAllRoles();
    const tripRoles = allRoles[tripId] || [];

    const newRole: TripRole = {
      id: `mock-role-${tripId}-${Date.now()}`,
      tripId,
      roleName,
      description,
      permissionLevel,
      featurePermissions: this.getDefaultFeaturePermissions(permissionLevel),
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memberCount: 0,
    };

    tripRoles.push(newRole);
    allRoles[tripId] = tripRoles;
    localStorage.setItem(this.MOCK_ROLES_KEY, JSON.stringify(allRoles));

    return newRole;
  }

  /**
   * Deletes a role from a trip in demo mode.
   */
  static deleteRole(tripId: string, roleId: string): boolean {
    const allRoles = this.getAllRoles();
    const tripRoles = allRoles[tripId] || [];

    const filteredRoles = tripRoles.filter(r => r.id !== roleId);
    if (filteredRoles.length === tripRoles.length) {
      return false; // Role not found
    }

    allRoles[tripId] = filteredRoles;
    localStorage.setItem(this.MOCK_ROLES_KEY, JSON.stringify(allRoles));
    return true;
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
