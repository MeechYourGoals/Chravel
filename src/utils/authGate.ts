import { DemoView } from '@/store/demoModeStore';

/**
 * Determines if an action should require authentication
 * @param demoView - Current demo view state ('off' | 'marketing' | 'app-preview')
 * @param user - Current authenticated user (null if not logged in)
 * @returns true if auth is required, false if action should proceed
 */
export const shouldRequireAuth = (demoView: DemoView, user: any): boolean => {
  // Mock mode (app-preview): never require auth - investor demo has full access
  if (demoView === 'app-preview') return false;

  // Logged in user: never require auth
  if (user) return false;

  // Marketing mode without user: require auth for protected features
  return demoView === 'marketing';
};

/**
 * Creates a mock user object for demo mode
 * Used when displaying settings/features in app-preview mode without real auth
 */
export const createMockDemoUser = () => ({
  // Use a UUID-shaped value so any UUID validation / PostgREST filters don't hard-fail.
  // This is a demo-only identity (no real Supabase auth session).
  id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  email: 'demo@chravel.com',
  displayName: 'Demo User',
  avatar: null,
  notificationSettings: {
    emailNotifications: true,
    pushNotifications: true,
    tripUpdates: true,
    chatMessages: true,
    calendarReminders: true,
  },
});
