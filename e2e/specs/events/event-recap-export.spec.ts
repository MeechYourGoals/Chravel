import { test, expect, devices } from '@playwright/test';

test.describe('Event recap export entry points', () => {
  test('desktop event header recap opens event export modal', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.setItem('TRIPS_DEMO_VIEW', 'app-preview');
    });
    await page.goto('/event/1');
    await page.waitForSelector('#root main', { timeout: 15000 });

    // Ensure the page has time to lazy load TripHeader
    await page.waitForTimeout(1000);
    const recapButton = page
      .getByRole('button', { name: /Event Recap|PDF Recap/i })
      .or(page.locator('button[aria-label="Create Event Recap"]'))
      .or(page.locator('button[title="Create Event Recap"]'))
      .or(page.locator('button[title="Create PDF Recap"]'))
      .or(page.locator('button[title="Print Recap"]'))
      .first();
    await expect(recapButton).toBeVisible({ timeout: 15000 });
    await recapButton.click();

    await expect(
      page.getByRole('heading', { name: /Create Event Recap|Create Trip Recap/i }),
    ).toBeVisible();
  });

  test('mobile event drawer recap opens event export modal', async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();

    await page.goto(`${baseURL}/`);
    await page.evaluate(() => {
      window.localStorage.setItem('TRIPS_DEMO_VIEW', 'app-preview');
    });
    await page.goto(`${baseURL}/event/1`);
    await page.waitForSelector('#root main', { timeout: 15000 });

    const detailsButton = page.getByRole('button', { name: 'View event details' });
    await expect(detailsButton).toBeVisible({ timeout: 15000 });
    await detailsButton.click();

    // Mobile drawer details might animate in, so ensure it's stable
    await page.waitForTimeout(1000);
    const recapButton = page
      .getByRole('button', { name: /Event Recap|PDF Recap/i })
      .or(page.locator('button[aria-label="Create Event Recap"]'))
      .or(page.locator('button[title="Create Event Recap"]'))
      .or(page.locator('button[title="Create PDF Recap"]'))
      .or(page.locator('button[title="Print Recap"]'))
      .first();
    await expect(recapButton).toBeVisible({ timeout: 15000 });
    await recapButton.click();

    await expect(
      page.getByRole('heading', { name: /Create Event Recap|Create Trip Recap/i }),
    ).toBeVisible();

    await context.close();
  });
});
