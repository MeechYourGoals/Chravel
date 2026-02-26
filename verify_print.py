
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Navigate to home
        await page.goto("http://localhost:8080/")

        # Wait for trip cards
        await page.wait_for_selector("h3", timeout=10000)

        # Click Recap on first card
        # Using a more robust selector if possible, or fallback to text
        # Assuming the 'Recap' button is visible on the card
        recap_buttons = await page.query_selector_all('button:has-text("Recap")')
        if not recap_buttons:
            print("Recap button not found")
            return

        await recap_buttons[0].click()

        # Wait for modal
        await page.wait_for_selector('h2:has-text("Create Trip Recap")', state='visible')

        # Take screenshot of the modal to verify Print button
        await page.screenshot(path="verification_print_modal.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
