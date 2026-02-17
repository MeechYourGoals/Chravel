// Hardcoded founder emails — always granted super admin (client-side only)
const FOUNDER_EMAILS = ['ccamechi@gmail.com', 'christian@chravelapp.com', 'demo@chravelapp.com'];

// Additional admins via env var (e.g., "admin2@example.com,admin3@example.com")
const envAdmins = (import.meta.env.VITE_SUPER_ADMIN_EMAILS as string) || '';
const additionalAdmins = envAdmins
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export const SUPER_ADMIN_EMAILS = [
  ...FOUNDER_EMAILS,
  ...additionalAdmins.filter(e => !FOUNDER_EMAILS.includes(e)),
];
