
import { test, expect } from '@playwright/test';

test('verify print functionality', async ({ page }) => {
  // Go to homepage
  await page.goto('http://localhost:8080/');

  // Wait for trip cards to load
  await page.waitForSelector('h3', { timeout: 10000 });

  // Click the "Recap" button on the first trip card
  const recapButton = page.locator('button:has-text("Recap")').first();
  await recapButton.click();

  // Wait for the modal to appear
  await page.waitForSelector('h2:has-text("Create Trip Recap")', { state: 'visible' });

  // Verify the Print button exists
  const printButton = page.locator('button[title="Print Recap"]');
  await expect(printButton).toBeVisible();

  // Take a screenshot of the modal with the print button
  await page.screenshot({ path: 'print_modal.png' });
});
