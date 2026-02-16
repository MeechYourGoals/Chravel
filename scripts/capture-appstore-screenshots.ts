/**
 * App Store Screenshot Capture Script
 *
 * Uses Playwright to capture screenshots of the Chravel web app at App Store dimensions.
 * Run: npm run screenshots:appstore
 *
 * Prerequisites:
 * 1. npm run build
 * 2. npm run preview -- --host 127.0.0.1 --port 8080 (in another terminal)
 * 3. npx playwright install chromium (first time only)
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8080';
const OUTPUT_BASE = path.join(process.cwd(), 'appstore', 'screenshots');

// iPhone 6.7" (iPhone 15 Pro Max) - 1290 x 2796
const IPHONE_67 = { width: 1290, height: 2796 };
// iPad Pro 12.9" - 2048 x 2732
const IPAD_129 = { width: 2048, height: 2732 };

const SCREENSHOTS = [
  { name: '01-home-dashboard', path: '/', waitFor: '[data-testid="trip-grid"], .trip-card, [class*="TripGrid"]' },
  { name: '02-trip-chat', path: '/trip/1', waitFor: '[class*="chat"], [class*="Chat"], textarea' },
  { name: '03-calendar-itinerary', path: '/trip/1', tab: 'calendar', waitFor: '[class*="calendar"], [class*="Calendar"]' },
  { name: '04-ai-concierge', path: '/trip/1', tab: 'ai', waitFor: '[class*="concierge"], [class*="Concierge"], [class*="chat"]' },
  { name: '05-expense-splitting', path: '/trip/1', tab: 'pay', waitFor: '[class*="expense"], [class*="payment"], [class*="Pay"]' },
  { name: '06-maps-places', path: '/trip/1', tab: 'map', waitFor: '[class*="map"], [class*="Map"], .gm-style' },
  { name: '07-media-gallery', path: '/trip/1', tab: 'media', waitFor: '[class*="media"], [class*="Media"], [class*="gallery"]' },
  { name: '08-polls-voting', path: '/trip/1', tab: 'polls', waitFor: '[class*="poll"], [class*="Poll"]' },
];

const IPAD_SCREENSHOTS = [
  { name: '01-home-dashboard', path: '/' },
  { name: '02-trip-chat', path: '/trip/1' },
  { name: '03-calendar-itinerary', path: '/trip/1', tab: 'calendar' },
  { name: '04-maps-places', path: '/trip/1', tab: 'map' },
];

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });

  // Enable demo mode via localStorage before any navigation
  await context.addInitScript(() => {
    localStorage.setItem('chravel_demo_mode', 'true');
    localStorage.setItem('chravel_demo_view', 'app-preview');
  });

  // iPhone 6.7"
  const iphoneDir = path.join(OUTPUT_BASE, 'iPhone-6.7');
  ensureDir(iphoneDir);

  const iphonePage = await context.newPage();
  await iphonePage.setViewportSize(IPHONE_67);

  for (const shot of SCREENSHOTS) {
    try {
      await iphonePage.goto(`${BASE_URL}${shot.path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await iphonePage.waitForTimeout(2000);

      // Click tab if specified
      if (shot.tab) {
        const tabSelectors = [
          `[data-tab="${shot.tab}"]`,
          `[aria-label="${shot.tab}"]`,
          `button:has-text("${shot.tab.charAt(0).toUpperCase() + shot.tab.slice(1)}")`,
          `a:has-text("${shot.tab.charAt(0).toUpperCase() + shot.tab.slice(1)}")`,
        ];
        for (const sel of tabSelectors) {
          try {
            await iphonePage.click(sel, { timeout: 2000 });
            await iphonePage.waitForTimeout(1500);
            break;
          } catch {
            continue;
          }
        }
      }

      const outPath = path.join(iphoneDir, `${shot.name}.png`);
      await iphonePage.screenshot({ path: outPath, fullPage: false });
      console.log(`  ✓ ${shot.name}.png (iPhone 6.7")`);
    } catch (e) {
      console.warn(`  ✗ ${shot.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await iphonePage.close();

  // iPad Pro 12.9"
  const ipadDir = path.join(OUTPUT_BASE, 'iPad-Pro-12.9');
  ensureDir(ipadDir);

  const ipadPage = await context.newPage();
  await ipadPage.setViewportSize(IPAD_129);

  for (const shot of IPAD_SCREENSHOTS) {
    try {
      await ipadPage.goto(`${BASE_URL}${shot.path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await ipadPage.waitForTimeout(2000);

      if (shot.tab) {
        const tabSelectors = [
          `[data-tab="${shot.tab}"]`,
          `button:has-text("${shot.tab.charAt(0).toUpperCase() + shot.tab.slice(1)}")`,
        ];
        for (const sel of tabSelectors) {
          try {
            await ipadPage.click(sel, { timeout: 2000 });
            await ipadPage.waitForTimeout(1500);
            break;
          } catch {
            continue;
          }
        }
      }

      const outPath = path.join(ipadDir, `${shot.name}.png`);
      await ipadPage.screenshot({ path: outPath, fullPage: false });
      console.log(`  ✓ ${shot.name}.png (iPad 12.9")`);
    } catch (e) {
      console.warn(`  ✗ ${shot.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await ipadPage.close();
  await browser.close();

  console.log('\nScreenshots saved to appstore/screenshots/');
}

captureScreenshots().catch(err => {
  console.error(err);
  process.exit(1);
});
