/**
 * App Store Screenshot Capture Script
 *
 * Captures screenshots from https://www.chravel.app/demo (live demo with pre-populated content).
 * Run: npm run screenshots:appstore
 *
 * Prerequisites:
 * 1. npx playwright install chromium (first time only)
 * 2. Network access to www.chravel.app
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.SCREENSHOT_BASE_URL || 'https://www.chravel.app';
const OUTPUT_BASE = path.join(process.cwd(), 'appstore', 'screenshots');

// iPhone 6.7" (iPhone 15 Pro Max) - 1290 x 2796
const IPHONE_67 = { width: 1290, height: 2796 };
// iPad Pro 12.9" - 2048 x 2732
const IPAD_129 = { width: 2048, height: 2732 };

// Tab IDs match TripTabs / MobileTripTabs: chat, calendar, concierge, media, payments, places, polls, tasks
const SCREENSHOTS = [
  { name: '01-home-dashboard', path: '/demo', tab: null },
  { name: '02-trip-chat', path: '/trip/1', tab: 'chat' },
  { name: '03-calendar-itinerary', path: '/trip/1', tab: 'calendar' },
  { name: '04-ai-concierge', path: '/trip/1', tab: 'concierge' },
  { name: '05-expense-splitting', path: '/trip/1', tab: 'payments' },
  { name: '06-maps-places', path: '/trip/1', tab: 'places' },
  { name: '07-media-gallery', path: '/trip/1', tab: 'media' },
  { name: '08-polls-voting', path: '/trip/1', tab: 'polls' },
];

const IPAD_SCREENSHOTS = [
  { name: '01-home-dashboard', path: '/demo', tab: null },
  { name: '02-trip-chat', path: '/trip/1', tab: 'chat' },
  { name: '03-calendar-itinerary', path: '/trip/1', tab: 'calendar' },
  { name: '04-maps-places', path: '/trip/1', tab: 'places' },
];

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function enableDemoAndNavigate(page: any, targetPath: string, isFirstNav: boolean) {
  if (isFirstNav) {
    // First navigation: go to /demo to enable demo mode, then we'll be redirected to /
    await page.goto(`${BASE_URL}/demo`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForURL(u => u.pathname === '/' || u.pathname.includes('from=demo'), { timeout: 15000 });
    await page.waitForTimeout(1500);
  }

  if (targetPath.startsWith('/trip/')) {
    await page.goto(`${BASE_URL}${targetPath}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1800);
  }
}

async function clickTab(page: any, tabId: string) {
  const selectors = [
    `[data-tab="${tabId}"]`,
    `button[data-tab="${tabId}"]`,
    `[role="tab"][data-tab="${tabId}"]`,
    `button:has-text("${tabId.charAt(0).toUpperCase() + tabId.slice(1)}")`,
  ];
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 3000 });
      await el.click();
      await page.waitForTimeout(1200); // Let tab content render
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

async function captureScreenshots() {
  console.log(`\nCapturing from ${BASE_URL}/demo ...\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  // iPhone 6.7"
  const iphoneDir = path.join(OUTPUT_BASE, 'iPhone-6.7');
  ensureDir(iphoneDir);

  const iphonePage = await context.newPage();
  await iphonePage.setViewportSize(IPHONE_67);

  for (let i = 0; i < SCREENSHOTS.length; i++) {
    const shot = SCREENSHOTS[i];
    try {
      await enableDemoAndNavigate(iphonePage, shot.path, i === 0);

      if (shot.tab) {
        const clicked = await clickTab(iphonePage, shot.tab);
        if (!clicked) {
          console.warn(`  ⚠ ${shot.name}: Could not find tab "${shot.tab}", capturing current view`);
        }
      }

      // Avoid capturing "Please Log In" - check we're not on auth gate
      const bodyText = await iphonePage.locator('body').textContent();
      if (bodyText?.includes('Please Log In') || bodyText?.includes('You need to be signed in')) {
        console.warn(`  ✗ ${shot.name}: Still on login screen - demo mode may not have activated`);
        continue;
      }

      const outPath = path.join(iphoneDir, `${shot.name}.png`);
      await iphonePage.screenshot({ path: outPath, fullPage: false });
      console.log(`  ✓ ${shot.name}.png (iPhone 6.7")`);
    } catch (e) {
      console.warn(`  ✗ ${shot.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await iphonePage.close();

  // iPad Pro 12.9" - use desktop user agent for wider layout
  const ipadContext = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  const ipadDir = path.join(OUTPUT_BASE, 'iPad-Pro-12.9');
  ensureDir(ipadDir);

  const ipadPage = await ipadContext.newPage();
  await ipadPage.setViewportSize(IPAD_129);

  // Re-enable demo for iPad (new context = fresh storage)
  await enableDemoAndNavigate(ipadPage, '/demo', true);

  for (let i = 0; i < IPAD_SCREENSHOTS.length; i++) {
    const shot = IPAD_SCREENSHOTS[i];
    try {
      await enableDemoAndNavigate(ipadPage, shot.path, false);

      if (shot.tab) {
        const clicked = await clickTab(ipadPage, shot.tab);
        if (!clicked) {
          console.warn(`  ⚠ ${shot.name}: Could not find tab "${shot.tab}", capturing current view`);
        }
      }

      const bodyText = await ipadPage.locator('body').textContent();
      if (bodyText?.includes('Please Log In') || bodyText?.includes('You need to be signed in')) {
        console.warn(`  ✗ ${shot.name}: Still on login screen`);
        continue;
      }

      const outPath = path.join(ipadDir, `${shot.name}.png`);
      await ipadPage.screenshot({ path: outPath, fullPage: false });
      console.log(`  ✓ ${shot.name}.png (iPad 12.9")`);
    } catch (e) {
      console.warn(`  ✗ ${shot.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await ipadPage.close();
  await ipadContext.close();
  await browser.close();

  console.log('\nScreenshots saved to appstore/screenshots/\n');
}

captureScreenshots().catch(err => {
  console.error(err);
  process.exit(1);
});
