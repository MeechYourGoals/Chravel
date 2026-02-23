# Manual QA Checklist for Concierge Search Modal

1.  **Open Concierge Search Modal:**
    -   Navigate to a Trip.
    -   Go to "Concierge" tab.
    -   Click the Search icon (magnifying glass) in the Concierge header.
    -   Verify the modal opens with the "Search across trip..." placeholder.

2.  **Search Functionality:**
    -   Type a keyword known to exist in the trip (e.g., "flight", "dinner", "pay").
    -   Verify that results appear after a short debounce.
    -   Verify that results are grouped by category (Concierge, Calendar, Tasks, etc.).
    -   Verify that the correct icons are displayed for each category.
    -   Verify that the search term is highlighted in the results.

3.  **Scope Verification:**
    -   Switch to another trip.
    -   Perform the same search.
    -   Verify that results from the previous trip do NOT appear (unless they exist in the current trip too).

4.  **Navigation:**
    -   Click on a "Calendar" result. Verify it navigates to the Calendar tab.
    -   Click on a "Task" result. Verify it navigates to the Tasks tab.
    -   Click on a "Concierge" result. Verify it stays on the Concierge tab and scrolls to the message (if the message is loaded in the view).
    -   Click on a "Place" result. Verify it navigates to the Places tab.

5.  **Empty State:**
    -   Search for a non-existent term (e.g., "xyz123").
    -   Verify the empty state message "No results found for..." appears.

6.  **Mobile Responsiveness:**
    -   Open the app in mobile view (or resize browser).
    -   Verify the modal fits the screen and is usable.
    -   Verify the input field autofocuses.

7.  **Performance:**
    -   Type quickly. Verify the UI doesn't freeze.
    -   Verify that the search indicator (spinner) appears while searching.
