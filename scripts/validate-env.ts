/**
 * Environment Variable Validator
 *
 * Ensures all required VITE_ env vars are set before build / dev.
 * Usage:  npx tsx scripts/validate-env.ts
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  {
    name: 'VITE_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL (e.g. https://xxx.supabase.co)',
  },
  {
    name: 'VITE_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous/public API key',
  },
  {
    name: 'VITE_GOOGLE_MAPS_API_KEY',
    required: false,
    description: 'Google Maps JavaScript API key (required for Places tab)',
  },
  {
    name: 'VITE_OAUTH_GOOGLE_ENABLED',
    required: false,
    description: 'Enable/disable Google OAuth button (default: true)',
  },
];

function validate(): void {
  const missing: EnvVar[] = [];
  const warnings: EnvVar[] = [];

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];
    if (!value || value.trim() === '') {
      if (envVar.required) {
        missing.push(envVar);
      } else {
        warnings.push(envVar);
      }
    }
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Optional env vars not set:');
    for (const w of warnings) {
      console.warn(`   ${w.name} — ${w.description}`);
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:\n');
    for (const m of missing) {
      console.error(`   ${m.name}`);
      console.error(`     ${m.description}\n`);
    }
    console.error('Copy .env.example to .env and fill in the values.\n');
    process.exit(1);
  }

  console.log('✅ All required environment variables are set.\n');
}

validate();
