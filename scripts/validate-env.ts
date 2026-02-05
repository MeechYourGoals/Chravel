#!/usr/bin/env node
/**
 * Chravel Environment Variable Validator
 *
 * Validates that all required environment variables are set for the current
 * build target. Exits with code 1 if any REQUIRED var is missing.
 *
 * Usage:
 *   npx tsx scripts/validate-env.ts          # validate for web (default)
 *   npx tsx scripts/validate-env.ts --ios     # validate for iOS Capacitor build
 *   npx tsx scripts/validate-env.ts --ci      # validate for CI (Playwright tests)
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface EnvVarSpec {
  name: string;
  required: boolean;
  description: string;
  provider: string;
  canStubForTestFlight: boolean;
  stubValue?: string;
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

const FRONTEND_VARS: EnvVarSpec[] = [
  {
    name: 'VITE_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    provider: 'Supabase',
    canStubForTestFlight: false,
  },
  {
    name: 'VITE_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous (public) key',
    provider: 'Supabase',
    canStubForTestFlight: false,
  },
  {
    name: 'VITE_GOOGLE_MAPS_API_KEY',
    required: true,
    description: 'Google Maps / Places API key',
    provider: 'Google Cloud Console',
    canStubForTestFlight: true,
    stubValue: 'STUB_MAPS_KEY',
  },
  {
    name: 'VITE_STRIPE_PUBLISHABLE_KEY',
    required: false,
    description: 'Stripe publishable key for payments UI',
    provider: 'Stripe Dashboard',
    canStubForTestFlight: true,
    stubValue: 'pk_test_stub',
  },
  {
    name: 'VITE_VAPID_PUBLIC_KEY',
    required: false,
    description: 'VAPID public key for Web Push notifications',
    provider: 'Self-generated (npx tsx scripts/generate-vapid-keys.ts)',
    canStubForTestFlight: true,
    stubValue: '',
  },
];

const FEATURE_FLAG_VARS: EnvVarSpec[] = [
  {
    name: 'VITE_ENABLE_DEMO_MODE',
    required: false,
    description: 'Enable demo/mock mode',
    provider: 'Internal flag',
    canStubForTestFlight: true,
    stubValue: 'false',
  },
  {
    name: 'VITE_ENABLE_AI_CONCIERGE',
    required: false,
    description: 'Enable AI Concierge feature',
    provider: 'Internal flag',
    canStubForTestFlight: true,
    stubValue: 'false',
  },
  {
    name: 'VITE_ENABLE_STRIPE_PAYMENTS',
    required: false,
    description: 'Enable Stripe payment processing',
    provider: 'Internal flag',
    canStubForTestFlight: true,
    stubValue: 'false',
  },
  {
    name: 'VITE_ENABLE_PUSH_NOTIFICATIONS',
    required: false,
    description: 'Enable push notifications',
    provider: 'Internal flag',
    canStubForTestFlight: true,
    stubValue: 'false',
  },
];

const ANALYTICS_VARS: EnvVarSpec[] = [
  {
    name: 'VITE_SENTRY_DSN',
    required: false,
    description: 'Sentry error tracking DSN',
    provider: 'Sentry',
    canStubForTestFlight: true,
    stubValue: '',
  },
  {
    name: 'VITE_POSTHOG_API_KEY',
    required: false,
    description: 'PostHog analytics API key',
    provider: 'PostHog',
    canStubForTestFlight: true,
    stubValue: '',
  },
  {
    name: 'VITE_GA_MEASUREMENT_ID',
    required: false,
    description: 'Google Analytics measurement ID',
    provider: 'Google Analytics',
    canStubForTestFlight: true,
    stubValue: '',
  },
  {
    name: 'VITE_MIXPANEL_TOKEN',
    required: false,
    description: 'Mixpanel analytics token',
    provider: 'Mixpanel',
    canStubForTestFlight: true,
    stubValue: '',
  },
];

const MOBILE_VARS: EnvVarSpec[] = [
  {
    name: 'IOS_BUNDLE_ID',
    required: false,
    description: 'iOS app bundle ID (defaults to com.chravel.app)',
    provider: 'Apple Developer Portal',
    canStubForTestFlight: false,
  },
  {
    name: 'IOS_APP_NAME',
    required: false,
    description: 'iOS app display name (defaults to Chravel)',
    provider: 'Apple Developer Portal',
    canStubForTestFlight: false,
  },
];

const REVENUECAT_VARS: EnvVarSpec[] = [
  {
    name: 'VITE_REVENUECAT_ENABLED',
    required: false,
    description: 'Enable RevenueCat IAP',
    provider: 'RevenueCat',
    canStubForTestFlight: true,
    stubValue: 'false',
  },
  {
    name: 'VITE_REVENUECAT_IOS_API_KEY',
    required: false,
    description: 'RevenueCat iOS API key',
    provider: 'RevenueCat Dashboard',
    canStubForTestFlight: true,
    stubValue: '',
  },
];

// ---------------------------------------------------------------------------
// Validation logic
// ---------------------------------------------------------------------------

function loadEnvFile(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env');
  const envLocalPath = path.resolve(process.cwd(), '.env.local');

  const vars: Record<string, string> = {};

  for (const p of [envPath, envLocalPath]) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (value) vars[key] = value;
      }
    }
  }

  // Also include process.env
  for (const [key, value] of Object.entries(process.env)) {
    if (value) vars[key] = value;
  }

  return vars;
}

function validate(): void {
  const args = process.argv.slice(2);
  const isIos = args.includes('--ios');
  const isCi = args.includes('--ci');

  const env = loadEnvFile();

  let allVars = [...FRONTEND_VARS, ...FEATURE_FLAG_VARS, ...ANALYTICS_VARS];
  if (isIos) {
    allVars = [...allVars, ...MOBILE_VARS, ...REVENUECAT_VARS];
  }

  const missing: EnvVarSpec[] = [];
  const optional: EnvVarSpec[] = [];
  const present: string[] = [];

  for (const spec of allVars) {
    const value = env[spec.name];
    if (value && value.length > 0) {
      present.push(spec.name);
    } else if (spec.required) {
      missing.push(spec);
    } else {
      optional.push(spec);
    }
  }

  // Output
  console.log('\n🔍 Chravel Environment Validation');
  console.log(`   Mode: ${isIos ? 'iOS Capacitor' : isCi ? 'CI' : 'Web'}`);
  console.log('─'.repeat(60));

  if (present.length > 0) {
    console.log(`\n✅ Present (${present.length}):`);
    for (const name of present) {
      console.log(`   ${name}`);
    }
  }

  if (optional.length > 0) {
    console.log(`\n⚠️  Optional / Missing (${optional.length}):`);
    for (const spec of optional) {
      const stub = spec.canStubForTestFlight
        ? ` [can stub: ${spec.stubValue ?? 'empty string'}]`
        : '';
      console.log(`   ${spec.name} — ${spec.description}${stub}`);
    }
  }

  if (missing.length > 0) {
    console.log(`\n❌ REQUIRED but missing (${missing.length}):`);
    for (const spec of missing) {
      console.log(`   ${spec.name}`);
      console.log(`     Provider: ${spec.provider}`);
      console.log(`     Purpose:  ${spec.description}`);
    }
    console.log('\n💡 Tip: Copy .env.example to .env and fill in the required values.');
    console.log('   The app uses hardcoded Supabase defaults for dev, but production builds need real keys.');
    process.exit(1);
  }

  console.log('\n✅ All required environment variables are present.\n');
}

validate();
