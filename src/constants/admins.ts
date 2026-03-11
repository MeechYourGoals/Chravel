// Founder emails that always have full admin access.
// These are verified against auth.users email (server-enforced, not client-spoofable).
const FOUNDER_EMAILS: string[] = [
  'ccamechi@gmail.com',
  'christian@chravelapp.com',
  'demo@chravelapp.com',
  'phil@philquist.com',
  'darren.hartgee@gmail.com',
];

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
