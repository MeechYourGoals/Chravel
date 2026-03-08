// Founder emails that always have full admin access.
// These are verified against auth.users email (server-enforced, not client-spoofable).
// NOTE: demo@chravelapp.com intentionally excluded — demo users must not have admin privileges.
const FOUNDER_EMAILS: string[] = ['ccamechi@gmail.com', 'christian@chravelapp.com'];

// Additional super admin emails can be set via VITE_SUPER_ADMIN_EMAILS env var (comma-separated).
const envAdmins = (import.meta.env.VITE_SUPER_ADMIN_EMAILS as string) || '';
const envAdminList = envAdmins
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

// Merge founder emails with env-configured emails, deduplicated
export const SUPER_ADMIN_EMAILS = [
  ...new Set([...FOUNDER_EMAILS.map(e => e.toLowerCase()), ...envAdminList]),
];
