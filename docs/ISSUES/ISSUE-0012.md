# ISSUE-0012: Missing data-testid Attributes on Critical UI Elements

**Severity:** Minor
**Area:** Testing
**Status:** Open

## Description

Many critical interactive elements lack `data-testid` attributes, forcing E2E tests to use fragile text/CSS selectors.

## Recommended Additions

- Trip cards in trip list
- Tab buttons (Chat, Calendar, Tasks, etc.)
- Chat message input
- Trip name heading in detail view
- Settings form fields
- Auth form fields
- Navigation elements

## Fix Plan

Add `data-testid` attributes to the above elements. No functional change.
