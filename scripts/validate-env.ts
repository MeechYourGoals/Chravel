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
  /** Optional regex to validate format (e.g., key prefix, URL pattern) */
  format?: RegExp;
  /** Human-readable format description for error messages */
  formatHint?: string;
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
    format: /^https:\/\/.+\.supabase\.co$/,
    formatHint: 'https://<project>.supabase.co',
  },
  {
    name: 'VITE_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous (public) key',
    provider: 'Supabase',
    canStubForTestFlight: false,
    format: /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/,
    formatHint: 'JWT token (eyJ...)',
  },
  {
    name: 'VITE_GOOGLE_MAPS_API_KEY',
    required: true,
    description: 'Google Maps / Places API key',
    provider: 'Google Cloud Console',
    canStubForTestFlight: true,
    stubValue: 'STUB_MAPS_KEY',
    format: /^AIza[A-Za-z0-9_-]{35}$/,
    formatHint: 'AIza... (39 characters)',
  },
  {
    name: 'VITE_STRIPE_PUBLISHABLE_KEY',
    required: false,
    description: 'Stripe publishable key for payments UI',
    provider: 'Stripe Dashboard',
    canStubForTestFlight: true,
    stubValue: 'pk_test_stub',
    format: /^pk_(test|live)_/,
    formatHint: 'pk_test_... or pk_live_...',
  },
  {
    name: 'VITE_VAPID_PUBLIC_KEY',
    required: false,
    description: 'VAPID public key for Web Push notifications',
    provider: 'Self-generated (npx tsx scripts/generate-vapid-keys.ts)',
    canStubForTestFlight: true,
    stubValue: '',
    format: /^[A-Za-z0-9_-]{80,}$/,
    formatHint: 'Base64url-encoded P-256 key (~87 characters)',
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
  {
    name: 'VITE_VOICE_LIVE_ENABLED',
    required: false,
    description: 'Enable Gemini Live voice (false in prod until confirmed)',
    provider: 'Internal flag',
    canStubForTestFlight: true,
    stubValue: 'false',
  },
  {
    name: 'VITE_VOICE_DIAGNOSTICS_ENABLED',
    required: false,
    description: 'Voice diagnostics (connection codes, audio params)',
    provider: 'Internal flag',
    canStubForTestFlight: true,
    stubValue: 'false',
  },
  {
    name: 'VITE_VOICE_USE_WEBSOCKET_ONLY',
    required: false,
    description: 'Enforce WebSocket for voice (reject SSE/HTTP)',
    provider: 'Internal flag',
    canStubForTestFlight: true,
    stubValue: 'true',
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
    format: /^https:\/\/.+@.+\.ingest\.sentry\.io\//,
    formatHint: 'https://<key>@<org>.ingest.sentry.io/<id>',
  },
  {
    name: 'VITE_POSTHOG_API_KEY',
    required: false,
    description: 'PostHog analytics API key',
    provider: 'PostHog',
    canStubForTestFlight: true,
    stubValue: '',
    format: /^phc_/,
    formatHint: 'phc_...',
  },
  {
    name: 'VITE_GA_MEASUREMENT_ID',
    required: false,
    description: 'Google Analytics measurement ID',
    provider: 'Google Analytics',
    canStubForTestFlight: true,
    stubValue: '',
    format: /^G-[A-Z0-9]+$/,
    formatHint: 'G-XXXXXXXXXX',
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
  {
    name: 'VITE_REVENUECAT_ANDROID_API_KEY',
    required: false,
    description: 'RevenueCat Android API key',
    provider: 'RevenueCat Dashboard',
    canStubForTestFlight: true,
    stubValue: '',
  },
];

const PAYMENT_VARS: EnvVarSpec[] = [
  {
    name: 'VITE_ENABLE_STRIPE_PAYMENTS',
    required: false,
    description: 'Enable Stripe payment processing',
    provider: 'Internal flag',
    canStubForTestFlight: true,
    stubValue: 'false',
  },
  {
    name: 'VITE_VENMO_CLIENT_ID',
    required: false,
    description: 'Venmo payment client ID',
    provider: 'Venmo Developer Portal',
    canStubForTestFlight: true,
    stubValue: '',
  },
];

const ADDITIONAL_VARS: EnvVarSpec[] = [
  {
    name: 'VITE_UNFURL_BASE_URL',
    required: false,
    description: 'Link unfurl/preview service URL',
    provider: 'Internal service',
    canStubForTestFlight: true,
    stubValue: '',
  },
  {
    name: 'VITE_APP_VERSION',
    required: false,
    description: 'App version (injected at build time)',
    provider: 'Build system',
    canStubForTestFlight: true,
    stubValue: '1.0.0',
  },
  {
    name: 'VITE_VOICE_DEBUG',
    required: false,
    description: 'Enable voice debugging console output',
    provider: 'Internal flag',
    canStubForTestFlight: true,
    stubValue: 'false',
  },
  {
    name: 'VITE_VOICE_AFFECTIVE_DIALOG',
    required: false,
    description: 'Enable emotional tone in voice responses',
    provider: 'Internal flag',
    canStubForTestFlight: true,
    stubValue: 'true',
  },
  {
    name: 'VITE_VOICE_PROACTIVE_AUDIO',
    required: false,
    description: 'Enable model-initiated speech',
    provider: 'Internal flag',
    canStubForTestFlight: true,
    stubValue: 'true',
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
        const value = trimmed
          .slice(eqIdx + 1)
          .trim()
          .replace(/^["']|["']$/g, '');
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

  let allVars = [
    ...FRONTEND_VARS,
    ...FEATURE_FLAG_VARS,
    ...ANALYTICS_VARS,
    ...PAYMENT_VARS,
    ...ADDITIONAL_VARS,
  ];
  if (isIos) {
    allVars = [...allVars, ...MOBILE_VARS, ...REVENUECAT_VARS];
  }

  const missing: EnvVarSpec[] = [];
  const optional: EnvVarSpec[] = [];
  const present: string[] = [];
  const formatWarnings: Array<{ name: string; value: string; hint: string }> = [];

  for (const spec of allVars) {
    const value = env[spec.name];
    if (value && value.length > 0) {
      present.push(spec.name);
      // Format validation (warn, don't fail — stubs and CI values may not match)
      if (spec.format && !isCi && !spec.stubValue) {
        if (!spec.format.test(value)) {
          formatWarnings.push({
            name: spec.name,
            value: value.slice(0, 12) + '...',
            hint: spec.formatHint || spec.format.source,
          });
        }
      }
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

  if (formatWarnings.length > 0) {
    console.log(`\n⚠️  Format warnings (${formatWarnings.length}):`);
    for (const fw of formatWarnings) {
      console.log(`   ${fw.name} = "${fw.value}"`);
      console.log(`     Expected format: ${fw.hint}`);
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
    console.log(
      '   The app uses hardcoded Supabase defaults for dev, but production builds need real keys.',
    );
    process.exit(1);
  }

  console.log('\n✅ All required environment variables are present.\n');
}

validate();
