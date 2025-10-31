
import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:8080/places")
        await page.screenshot(path="jules-scratch/verification/initial_page.png") # Take screenshot immediately
        await page.wait_for_selector('input[placeholder="Search for a place..."]', timeout=30000)
        await page.fill('input[placeholder="Search for a place..."]', "SoFi Stadium")
        await page.press('input[placeholder="Search for a place..."]', "Enter")
        await page.wait_for_timeout(2000)  # Wait for map to settle
        await page.screenshot(path="jules-scratch/verification/verification.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
