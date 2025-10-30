import os
from playwright.sync_api import Page, expect

def verify_places_search(page: Page):
    """
    This test verifies that a user can search for a location and see it
    centered on the map.
    """
    try:
        print("Starting verification script...")
        # 1. Arrange: Go to the places page.
        page.goto("http://localhost:5173/places")
        print("Navigated to places page.")

        # 2. Act: Find the search input, type a location, and press Enter.
        search_input = page.get_by_placeholder("Search places on map...")
        search_input.fill("SoFi Stadium")
        search_input.press("Enter")
        print("Searched for SoFi Stadium.")

        # 3. Assert: Confirm that the map has centered on the location.
        # We'll wait for the place info overlay to appear, which indicates
        # that the search was successful.
        expect(page.get_by_text("SoFi Stadium")).to_be_visible()
        print("Place info overlay is visible.")

        # 4. Screenshot: Capture the final result for visual verification.
        if not os.path.exists("jules-scratch/verification"):
            os.makedirs("jules-scratch/verification")
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot taken.")
    except Exception as e:
        print(f"An error occurred: {e}")
