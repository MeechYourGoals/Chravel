# Design System Consistency Audit

_Date: 2026-02-27_

## Scope
Audit focus areas requested:
- Button variants
- Typography scale
- Spacing rhythm
- Color token usage
- Reusable component opportunities

## Methodology
I audited canonical token definitions and sampled implementation usage with codebase-wide static checks:

- `src/components/ui/button.tsx` (canonical button API)
- `tailwind.config.ts` (typography, spacing, color scales)
- `src/index.css` (CSS custom property color tokens)
- `src/**/*.tsx` (real usage patterns)

## Findings

### 1) Button variant consistency: **Medium risk / fragmented adoption**

**What is consistent**
- A shared `Button` primitive exists with a variant + size API (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) and touch-target-aware sizing (`min-h-[48px]` for default/icon). 

**Where consistency breaks**
- `Button` usage is high (624 tags), but 306 instances override styling via `className`, reducing variant predictability.
- Raw `<button>` usage is also high (634 occurrences), indicating that many interaction patterns bypass the design-system primitive entirely.
- Variant usage is skewed:
  - implicit default: 283
  - outline: 202
  - ghost: 127
  - destructive: 6
  - default (explicit): 4
  - secondary: 2

**Implication**
- The API exists, but product surfaces still encode visual state ad hoc (especially in local component styles), increasing drift and accessibility risk.

---

### 2) Typography scale consistency: **High risk / token underuse**

**Token inventory exists**
- Tailwind defines a custom semantic scale (`display`, `h1`, `h2`, `h3`, `body`, `caption`, etc.) with desktop variants.

**Adoption is low**
- Semantic text tokens are rarely used (8 total hits in TSX across all semantic `text-*` typography tokens).
- Core scale classes are heavily used instead (`text-sm/base/lg/xl/...`: 3184 hits).
- Arbitrary size usage is significant (`text-[...]`: 105 hits).

**Implication**
- Typography appears curated in config but not operationalized in app code, so hierarchy differs page-to-page and mobile parity is hard to enforce.

---

### 3) Spacing rhythm consistency: **High risk / utility-level spacing dominates**

**Token inventory exists**
- Tailwind defines spacing semantics (`page-gutter-mobile`, `section-gap`, `card-padding`, `touch-target`, etc.).

**Adoption is near-zero**
- Spacing token usage in TSX: 3 hits.
- Arbitrary spacing values (`p-[...]`, `gap-[...]`, etc.): 36 hits.

**Implication**
- Vertical rhythm is mostly encoded per component rather than shared layout primitives, making dense pages visually inconsistent and expensive to tune.

---

### 4) Color token consistency: **Medium-high risk / semantic + palette mixed**

**What is strong**
- Semantic color architecture is present (`primary`, `secondary`, `muted`, `accent`, etc.) with CSS variables in `index.css` and Tailwind mappings.

**Where drift appears**
- Semantic token utility usage is healthy (1949 hits), but raw palette utility usage is higher (3759 hits).
- Arbitrary color values are present (`bg-[#...]` / `hsl(...)` classes): 18 hits.
- Top recurring raw classes include `text-gray-400` (799), `text-gray-300` (422), `bg-gray-800` (325), and `border-gray-600` (215).

**Implication**
- The system currently has two parallel color systems: semantic tokens and direct palette colors. This weakens themeability and dark/light mode control.

---

### 5) Reusable component opportunities: **High ROI opportunities available now**

Repeated button-like class clusters suggest missing primitives:

1. **Icon-only action button**
   - Repeats: `p-2 bg-white/10 hover:bg-white/20 ... rounded-lg ...`
2. **Inline text action / back link**
   - Repeats: `text-gray-400 hover:text-white transition-colors`
3. **List row action button**
   - Repeats: `w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg ...`
4. **Filter/segmented chip**
   - Repeats: `flex items-center gap-1 px-3 py-1 text-xs font-medium ... rounded-lg`
5. **Mobile touch icon affordance**
   - Repeats: `min-w-[44px] min-h-[44px] ... touch-manipulation ...`

These should become wrappers around `Button` (or sibling primitives) to preserve one interaction contract.

## Proposed Standardized System

## A) Buttons (single source of truth)

### Standard variant matrix
- `primary` (maps existing `default`)
- `secondary`
- `outline`
- `ghost`
- `destructive`
- `link`

### Standard size matrix
- `sm` (40px)
- `md` (48px default tap-safe)
- `lg` (56px)
- `icon-sm` (40x40)
- `icon-md` (48x48)

### New composable wrappers
- `<IconButton />`
- `<TextButton />` (for inline actions)
- `<ListActionButton />`
- `<SegmentedChipButton />`

All wrappers should consume `Button` + constrained tokens only.

## B) Typography (semantic-first)

### Canonical semantic roles
- `display`, `h1`, `h2`, `h3`, `body`, `body-sm`, `caption`
- Remove practical dependence on raw `text-sm/base/lg` in product surfaces (allow only in isolated utility contexts).

### Recommended implementation
- Introduce `<Text variant="h2" />` wrapper that maps to semantic classes.
- Add lint rule (or custom ESLint regex rule) to flag new `text-[...]` arbitrary sizes outside exceptions.

## C) Spacing rhythm (8px grid with named layout contracts)

### Core spacing scale (recommendation)
- 4, 8, 12, 16, 24, 32, 40, 48

### Semantic layout tokens
- `layout.pageX` → `page-gutter-mobile/desktop`
- `layout.sectionY` → `section-gap/section-gap-desktop`
- `layout.cardPadding` → `card-padding/...`
- `layout.touchTarget` → `touch-target`

### Recommended implementation
- Add `PageContainer`, `SectionStack`, and `CardSection` primitives so spacing decisions are not repeated manually.

## D) Color tokens (semantic-only in feature code)

### Enforceable policy
- Feature/UI code should prefer semantic color classes only (`text-muted-foreground`, `bg-card`, etc.).
- Raw palette utilities (`text-gray-400`, `bg-gray-800`, etc.) allowed only in design-token layer and legacy migration exceptions.

### Recommended implementation
- Add a lint rule or codemod check to block new raw palette classes in `src/features`, `src/pages`, and `src/components` (except `src/components/ui` token files).

## E) Migration strategy (safe + incremental)

### Phase 1 — Guardrails (no visual churn)
- Freeze new raw `<button>` usage in feature code.
- Freeze new arbitrary typography sizes and raw palette colors.
- Publish component recipes and usage examples.

### Phase 2 — High-impact normalization
- Convert top 20 files by raw `<button>` count to `Button` wrappers.
- Replace top repeated text-size and spacing patterns in route-level pages.

### Phase 3 — Completion
- Migrate remaining outliers opportunistically when touching those files.
- Add dashboard metrics in CI: raw button count, raw palette count, arbitrary text count.

## Suggested success metrics (track in CI)
- Raw `<button>` count: 634 → <150
- Arbitrary `text-[...]` count: 105 → <15
- Raw palette class count: 3759 → <1000
- Semantic typography token usage: 8 → >400
- Spacing token usage: 3 → >250

## Priority action plan (next sprint)
1. Build and ship `IconButton`, `TextButton`, `ListActionButton`, and `SegmentedChipButton`.
2. Add `Text` typography wrapper + migration docs.
3. Add lint checks for raw palette + arbitrary text sizes in feature code.
4. Normalize the top 10 highest-drift screens first (mobile trip/event surfaces + auth flows).
