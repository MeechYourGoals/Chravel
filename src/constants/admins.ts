// Super admin emails are loaded exclusively from environment variables.
// Set VITE_SUPER_ADMIN_EMAILS in .env (comma-separated list of emails).
// No hardcoded emails in source code to prevent credential exposure.
const envAdmins = (import.meta.env.VITE_SUPER_ADMIN_EMAILS as string) || '';

export const SUPER_ADMIN_EMAILS = envAdmins
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);
