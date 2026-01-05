# Palette's Journal 🎨

## 2026-01-05 - Initial Accessibility Audit
**Learning:** Chravel has systematic accessibility gaps - only 54/486 components use aria-label, and icon-only buttons are common pattern without proper labels.
**Action:** Priority fix: Add aria-labels to all icon-only buttons in chat, modals, and forms. Look for `<Button variant="ghost" size="icon">` pattern without aria-label attribute.
