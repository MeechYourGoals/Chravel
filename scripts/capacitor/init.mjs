import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * Non-interactive Capacitor init helper.
 *
 * Why this exists:
 * - `npx cap init` prompts interactively by default.
 * - We want an incremental, repeatable setup that can be run safely.
 *
 * Inputs (required):
 * - `IOS_APP_NAME` (e.g. "Chravel")
 * - `IOS_BUNDLE_ID` (e.g. "com.chravel.app")
 *
 * These are intentionally aligned with `.env.production.example`.
 */

function mustGetEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing ${key}. Set it and re-run.\n` +
        `Example:\n` +
        `  IOS_APP_NAME="Chravel" IOS_BUNDLE_ID="com.chravel.app" npm run cap:init\n`,
    );
  }
  return value;
}

function run(cmd) {
  // eslint-disable-next-line no-console
  console.log(`\n[cap:init] ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

const appName = mustGetEnv('IOS_APP_NAME');
const appId = mustGetEnv('IOS_BUNDLE_ID');

// Ensure web assets exist (Capacitor needs a webDir to sync/copy).
if (!existsSync(new URL('../../dist', import.meta.url))) {
  run('npm run build');
}

// Initialize Capacitor config if missing (creates `capacitor.config.*`).
// Note: this will not overwrite an existing config.
if (
  !existsSync(new URL('../../capacitor.config.ts', import.meta.url)) &&
  !existsSync(new URL('../../capacitor.config.js', import.meta.url)) &&
  !existsSync(new URL('../../capacitor.config.json', import.meta.url))
) {
  run(`npx cap init "${appName}" "${appId}" --web-dir=dist`);
}

// Add iOS project if missing.
if (!existsSync(new URL('../../ios', import.meta.url))) {
  run('npx cap add ios');
}

// Keep native project in sync with web build.
run('npx cap sync ios');

