# Design System Consistency Audit (Chravel)

_Date_: 2026-02-27  
_Scope_: Button variants, typography scale, spacing rhythm, color token usage, reusable component opportunities.

## Method

This audit combined source-of-truth review and codebase usage scans:

- Reviewed design tokens + base theme definitions in `tailwind.config.ts` and `src/index.css`.
- Reviewed canonical button primitives in `src/components/ui/button.tsx`, `src/components/ui/interactive-button.tsx`, and `src/components/ui/ActionPill.tsx`.
- Ran repo-wide scans for class patterns and component usage to identify divergence.

## Executive Summary

The codebase has a strong token foundation (Tailwind theme + CSS variables), but implementation consistency is currently mixed:

1. **Buttons are fragmented**: `Button` is widely used, but there is near-equal raw `<button>` usage and multiple custom button styles.
2. **Typography tokens are under-adopted**: custom semantic type scale exists, but most UI uses utility sizes (`text-sm`, `text-xs`, etc.) and arbitrary pixel classes.
3. **Spacing rhythm is mostly healthy but not codified**: dominant spacing is on Tailwind scale (`gap-2`, `p-4`, `mb-4`), yet there are context-specific one-off patterns and duplicated layout strings.
4. **Color token drift is high**: hardcoded palette utilities (`text-gray-*`, `bg-white/*`) significantly outnumber semantic token usage.
5. **Reusable opportunities are clear**: repeated class bundles indicate at least 5–7 extraction candidates (section headers, surface cards, icon buttons, muted text blocks, stats rows).

---

## 1) Button Variants Audit

### Current state

- Canonical `Button` primitive supports variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` and sizes `default/sm/lg/icon`.
- `InteractiveButton` composes `Button` (good), but introduces color overrides (`bg-green-500`) outside semantic tokens.
- `ActionPill` is a separate raw `<button>` with variant styling not aligned to `buttonVariants` API.

### Usage findings

- `Button` component usage: **624** occurrences.
- Raw `<button>` usage: **634** occurrences.
- Raw literal button class patterns show high duplication (e.g. icon-button and glass-button patterns repeated).

### Assessment

- ✅ Good: Base primitive exists with CVA + shared focus/disabled handling.
- ⚠️ Risk: Inconsistent UX/accessibility details across raw buttons (size, focus rings, min tap target, disabled semantics).
- ⚠️ Risk: Brand drift from raw gradient/gray/white classes in business features.

### Standard proposal

Adopt a **single action hierarchy** with composable intent + tone:

- `Button` = canonical primitive for all standard actions.
- Add variants to `buttonVariants` instead of ad hoc styling in feature code:
  - `brand` (current default)
  - `neutral`
  - `danger`
  - `subtle`
  - `glass` (for cinematic surfaces)
  - `pill` (for tab-height actions; subsumes `ActionPill`)
- Add sizes: `xs`, `sm`, `md`, `lg`, `icon-sm`, `icon-md` with enforced min tap target behavior (`min-h-[44px]` mobile baseline).
- Restrict raw `<button>` to cases that cannot use `Button` (documented exceptions).

---

## 2) Typography Scale Audit

### Current state

- Tailwind defines semantic typography tokens (`display`, `h1/h2/h3`, `body`, `caption`, hero sizes).
- Global base styles map HTML tags to semantic tokens (`h1`, `h2`, `h3`, `p`).

### Usage findings

- Semantic text token usage in TSX is very low (single-digit use for most tokens).
- Utility typography dominates (`text-sm`, `text-xs`, `text-lg`, etc.) and includes arbitrary font sizes like `text-[10px]`, `text-[11px]`, `text-[13px]`, `text-[17px]`.

### Assessment

- ✅ Good: Semantic scale exists and is mobile-aware.
- ⚠️ Risk: Actual UI typography is largely unconstrained, causing visual inconsistency and poor maintainability.

### Standard proposal

Define and enforce a **semantic type API**:

- Canonical text styles:
  - `display`, `title-1`, `title-2`, `title-3`, `body`, `body-strong`, `caption`, `micro`
- Implement as a `Text` component (or `typography.ts` helper + class variants) to unify font size, line height, weight, and color defaults.
- Ban arbitrary font-size utilities except in explicitly whitelisted edge cases.
- Migration rule: new features must use semantic text styles; legacy utilities migrated opportunistically.

---

## 3) Spacing Rhythm Audit

### Current state

- Tailwind spacing scale is heavily used (`gap-1..4`, `p-3/4/6`, `mb-2/4/6`, etc.).
- Theme defines semantic spacing tokens (`page-gutter-mobile`, `section-gap`, `card-padding`, `touch-target`), but they are not consistently surfaced as reusable layout primitives.

### Usage findings

- Very low arbitrary spacing usage (14 total arbitrary spacing class hits), mostly safe-area related.
- Repeated layout snippets (`flex items-center gap-2`, `flex items-center justify-between`, etc.) appear heavily across pages.

### Assessment

- ✅ Good: Core spacing mostly aligned with Tailwind scale.
- ⚠️ Risk: Rhythm remains implicit and duplicated at callsites instead of reusable layout components.

### Standard proposal

Introduce lightweight layout primitives:

- `Stack` (`gap` scale constrained to design-system steps).
- `Inline` (row alignment presets).
- `Section` (standard vertical spacing + container).
- `Surface` (card padding/radius/border presets).

Spacing scale recommendation (mobile-first): `4, 8, 12, 16, 24, 32, 48` px.

---

## 4) Color Token Usage Audit

### Current state

- Robust token foundation via CSS vars and Tailwind semantic colors (`primary`, `foreground`, `muted`, etc.).
- Expanded brand-specific palettes exist (`glass`, `gold-*`, `chat-*`).

### Usage findings

- Approximate class scan shows hardcoded color utility usage significantly outweighs semantic token usage:
  - Raw color-like classes: **7048**
  - Token color classes (tracked subset): **1729**
- Most frequent raw classes include `text-white`, `text-gray-400`, `bg-white/5`, `border-white/10`, `bg-gray-800`.

### Assessment

- ✅ Good: Token infrastructure is present and capable.
- ⚠️ Risk: Token bypass creates visual drift, difficult theming, and high refactor cost.

### Standard proposal

Move to a **semantic color role model** and phase out direct gray/white utilities in product UI:

- Roles: `fg/default`, `fg/muted`, `fg/inverse`, `bg/base`, `bg/elevated`, `bg/subtle`, `border/default`, `border/subtle`, `state/success|warning|error|info`.
- Keep brand accents (`gold`, `glass`, `chat`) behind named semantic aliases for specific contexts.
- Add lint guardrails (custom ESLint regex or stylelint rule) to flag non-whitelisted raw palette classes in `src/pages` and `src/features`.

---

## 5) Reusable Component Opportunities

Based on repeated class bundles and visual patterns, prioritize these extractions:

1. **`SectionHeader`**: title + subtitle + action slot (`justify-between`, common heading sizing).
2. **`SurfaceCard`**: elevated content container (background, border, radius, padding).
3. **`IconButton`**: consistent icon-only control size/focus ring/hover behavior.
4. **`MetaText`**: muted helper text + caption variants.
5. **`StatRow` / `KeyValueRow`**: label-value row for dashboard/settings summaries.
6. **`ActionCluster`**: aligned action groups with responsive stack behavior.

These additions should reduce repeated literal class strings and raise consistency without a risky rewrite.

---

## Proposed Standardized System (v1)

## A. Foundation tokens

- Keep Tailwind + CSS variable architecture.
- Consolidate color aliases to a minimal semantic set; preserve brand palettes behind semantic roles.
- Keep current spacing scale but publish explicit allowed steps and usage guidance.

## B. Component primitives

- Actions: `Button`, `IconButton`, `ActionPill` (as `Button` variant).
- Typography: `Text` primitive with semantic variants.
- Layout: `Stack`, `Inline`, `Section`, `Surface`.
- Feedback: semantic badges/alerts tied to status tokens.

## C. Enforcement

- Add lint rules for:
  - no arbitrary font sizes (`text-[Npx]`) outside allowlist.
  - no raw gray/white color classes in feature/page layers (allow exceptions in intentionally branded modules).
  - no raw `<button>` in app feature code unless annotated `// design-system-exception`.
- Add Storybook-style gallery page (or internal docs route) for all primitives and variants.

## D. Rollout plan (low-risk)

1. **Phase 1 — Token codification**: finalize semantic roles + lint warnings only.
2. **Phase 2 — Primitive hardening**: extend `Button`, add `Text` + `IconButton`.
3. **Phase 3 — Incremental migration**: top 20 high-traffic screens first (TripDetail, Chat, Calendar, Join).
4. **Phase 4 — Enforcement**: promote lint warnings to errors for new/edited files.

---

## Success Metrics

Track before/after:

- `% actions using Button primitive` (target: >90% in feature/page code).
- `% text styles using semantic typography API` (target: >80% on migrated screens).
- `raw color utility usage / semantic token usage` ratio (target: reduce by 50% in first migration wave).
- Duplicate class bundle frequency for top 20 repeated strings (target: reduce by 40%).

## Risk Notes

- Largest migration risk is visual regressions in heavily customized pages.
- Mitigation: migrate by surface area, validate at 375px mobile + desktop, and keep screenshot diff checks for key pages.

