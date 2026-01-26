const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_GOOGLE_MAPS_API_KEY',
  'VITE_STREAM_API_KEY',
] as const;

export function validateEnv() {
  // Skip validation in test environment
  if (import.meta.env.MODE === 'test') {
    return;
  }

  const missing = requiredEnvVars.filter(
    (key) => !import.meta.env[key]
  );

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}. See .env.example`;

    // Log prominently
    console.error(
      '%c CRITICAL ERROR ',
      'background: #ef4444; color: #ffffff; font-weight: bold; padding: 4px; border-radius: 4px;',
      message
    );

    // Throw error to prevent app initialization with broken config
    throw new Error(message);
  }

  if (import.meta.env.DEV) {
    console.log(
      '%c ENV CHECK ',
      'background: #10b981; color: #ffffff; font-weight: bold; padding: 4px; border-radius: 4px;',
      'All required environment variables are present.'
    );
  }
}
