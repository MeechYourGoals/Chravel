// Super admin emails configured via VITE_SUPER_ADMIN_EMAILS environment variable
// Format: comma-separated list, e.g., "admin1@example.com,admin2@example.com"
const envAdmins = (import.meta.env.VITE_SUPER_ADMIN_EMAILS as string) || '';
export const SUPER_ADMIN_EMAILS = envAdmins
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);
