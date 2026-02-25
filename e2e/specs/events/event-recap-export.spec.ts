import { test, expect, devices } from '@playwright/test';

test.describe('Event recap export entry points', () => {
  test('desktop event header recap opens event export modal', async ({ page }) => {
    await page.goto('/event/1');
    await page.waitForSelector('#root > *', { timeout: 15000 });

    const recapButton = page.getByRole('button', { name: 'Create Event Recap' });
    await expect(recapButton).toBeVisible({ timeout: 15000 });
    await recapButton.click();

    await expect(page.getByRole('heading', { name: 'Create Event Recap' })).toBeVisible();
  });

  test('mobile event drawer recap opens event export modal', async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();

    await page.goto(`${baseURL}/event/1`);
    await page.waitForSelector('#root > *', { timeout: 15000 });

    const detailsButton = page.getByRole('button', { name: 'View event details' });
    await expect(detailsButton).toBeVisible({ timeout: 15000 });
    await detailsButton.click();

    const recapButton = page.getByRole('button', { name: 'Create Event Recap' });
    await expect(recapButton).toBeVisible({ timeout: 15000 });
    await recapButton.click();

    await expect(page.getByRole('heading', { name: 'Create Event Recap' })).toBeVisible();

    await context.close();
  });
});
