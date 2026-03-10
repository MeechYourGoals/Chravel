

## Fix: Organization Logo Section Alignment

### Problem
The Organization Logo card (lines 78–105 of `OrganizationSection.tsx`) has elements scattered with inconsistent alignment: the logo placeholder sits top-left, the camera overlay button floats bottom-right of the logo, and the "Upload Logo" button and helper text sit beside/below with `items-start` — creating a visually sloppy, off-center layout as shown in the screenshot.

### Proposed Fix
Vertically center-align all elements within the logo card into a single clean column layout:

**File: `src/components/enterprise/OrganizationSection.tsx` (lines 78–105)**

Replace the current scattered `flex-col items-start` layout with a centered stack:

```
┌─────────────────────────────┐
│     Organization Logo       │  ← heading, centered
│                             │
│        ┌──────────┐         │
│        │  Logo    │         │  ← 24×24 rounded icon, centered
│        │  Icon    │         │
│        └──────────┘         │
│           📷                │  ← camera overlay, centered on logo
│                             │
│      [ Upload Logo ]        │  ← button, centered
│                             │
│  PNG, SVG or JPG. Max 2MB.  │  ← helper text, centered
└─────────────────────────────┘
```

Changes:
- Outer flex container: `flex flex-col items-center` (was `items-start`)
- Heading: add `text-center w-full`
- Logo placeholder: keep centered via parent flex
- "Upload Logo" button: centered naturally by parent
- Helper text: add `text-center`

This is a pure CSS alignment change — no structural, logic, or behavioral modifications.

