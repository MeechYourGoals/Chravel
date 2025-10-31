from playwright.sync_api import Page, expect

def test_pdf_export_modal(page: Page):
    """
    This test verifies that the PDF export modal opens correctly on the Trip Detail page.
    """
    # 1. Arrange: Go to the Trip Detail page for a mock trip.
    page.goto("http://localhost:5173/trip/1")

    # 2. Act: Find the "Export" button and click it.
    export_button = page.get_by_role("button", name="Export")
    export_button.click()

    # 3. Assert: Confirm that the export modal is visible.
    expect(page.get_by_role("heading", name="Export Trip")).to_be_visible()

    # 4. Screenshot: Capture the export modal for visual verification.
    page.screenshot(path="jules-scratch/verification/pdf_export_modal.png")
