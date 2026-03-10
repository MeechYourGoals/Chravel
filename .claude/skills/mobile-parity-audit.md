---
name: mobile-parity-audit
description: Deep audit for mobile parity across web, PWA, and native-wrapper experiences. Use to find feature gaps, layout drift, interaction mismatches, broken mobile-first flows, touch-target issues, empty-state inconsistencies, and platform-specific regressions, then recommend or implement the highest-leverage parity fixes without breaking product behavior.
---

# mobile-parity-audit

You are performing a **mobile parity audit** on a production application.

Your job is to identify where the product experience diverges across:
- desktop web
- mobile web / PWA
- native wrapper / app shell if relevant

This is not just responsive QA.

This is a **product parity, interaction parity, and behavior parity audit**.

You are checking whether users on mobile get:
- the same core capabilities
- the same clarity
- the same quality bar
- the same confidence in what the app can do

Default mode:
- inspect first
- compare equivalent flows across platforms
- identify accidental drift
- separate intentional platform adaptation from broken parity
- recommend the highest-leverage fixes
- preserve behavior and product intent
- avoid churn for harmless differences

If execution is explicitly requested, implement the smallest set of changes that delivers the biggest real parity gain.

---

## Core objective

Ensure the mobile experience is not a degraded afterthought.

Audit parity across these dimensions:

1. Feature availability
2. Navigation and discoverability
3. Empty states and starter states
4. Creation and edit flows
5. Visual consistency
6. Touch ergonomics
7. Layout and density
8. Performance and interaction smoothness
9. State synchronization and correctness
10. Platform-specific affordances and constraints

---

## What to audit aggressively

### 1) Feature parity
Look for:
- features available on web but missing on mobile
- actions visible on one platform and hidden on another
- import flows available on desktop but absent in PWA/mobile
- AI actions that expose different capabilities by platform
- settings options missing on one platform
- tabs or subfeatures with incomplete parity
- mobile routes/screens not wired to the same functionality
- "works on web" implementations with placeholder mobile UI

Questions:
- what can desktop users do that mobile users cannot?
- is the missing parity intentional or accidental?
- are core workflows blocked on mobile?

### 2) Starter, empty, and default state parity
Look for:
- blank mobile screens where desktop shows useful starter UI
- tabs that require clicking plus before users see anything
- default create modals present on web but absent on mobile
- empty-state copy, CTA, or scaffolding mismatch
- mobile states that feel broken because they are visually empty
- first-run flows that differ without reason

Questions:
- does mobile teach users how to start?
- is mobile showing a dead end where web shows a guided state?
- which feature families should share the same starter model?

### 3) Create/edit flow parity
Look for:
- create flows easier on one platform than the other
- modals on web but inaccessible sheet patterns on mobile
- missing controls in mobile forms
- edit actions buried or absent on mobile
- different validation/error handling by platform
- create confirmation patterns drifting across platforms
- desktop assumptions leaking into mobile interactions

Questions:
- can users complete the same job on mobile?
- are mobile creation flows simpler, or just worse?
- are edit flows equally discoverable and safe?

### 4) Navigation parity
Look for:
- tabs/routes/screens wired differently on mobile
- actions hidden in menus on mobile but obvious on web
- back behavior inconsistent
- route transitions that strand users
- modal-to-screen transformations that lose functionality
- deep links or invite flows behaving differently
- platform-specific nav shells causing feature confusion

Questions:
- can users find the same features?
- do mobile users need more taps for the same job?
- is navigation adaptation intentional or accidental?

### 5) Layout and density parity
Look for:
- content compressed or broken on mobile
- cards/rows collapsing poorly
- chat/activity elements overlapping
- unreadable density
- horizontal overflow
- inconsistent spacing and padding
- typography hierarchy breaking down on small screens
- important information pushed below the fold unnecessarily

Questions:
- does mobile preserve clarity, not just content?
- is the layout truly mobile-first or desktop squeezed down?
- which screens need a distinct mobile structure?

### 6) Touch ergonomics
Look for:
- buttons too small
- destructive and primary actions too close together
- accidental taps on delete vs playback vs edit
- controls too close to screen edges
- scroll and swipe conflicts
- tap targets inconsistent across feature areas
- hover-based desktop assumptions still present
- gesture or keyboard interactions blocking usability

Questions:
- can users operate this one-handed?
- where are accidental taps likely?
- where does interaction design ignore touch reality?

### 7) Interaction and feedback parity
Look for:
- actions confirmed on web but silent on mobile
- AI claims success without visible result on one platform
- inconsistent toasts, cards, banners, or inline confirmations
- loading states different by platform
- buttons with no feedback after tap
- success/error flows not equally legible
- imported or saved items surfacing differently across platforms

Questions:
- does the app reassure users equally well on mobile?
- where does mobile make users doubt whether anything happened?
- which confirmations should be canonical across all platforms?

### 8) Data/state correctness parity
Look for:
- actions succeeding on web but not appearing on mobile
- trip joins/invites working differently
- cached mobile state not refreshing
- stale lists on mobile home screens
- newly created content not appearing
- mobile routes reading different state paths
- auth/session edge cases affecting one platform more than another

Questions:
- does mobile show the same truth as web?
- are there stale cache or hydration issues?
- are platform-specific state assumptions causing bugs?

### 9) Performance and load behavior
Look for:
- black/blank screens before feature load
- slower modal opening on mobile
- oversized bundles punishing mobile
- blocking spinners hiding broken states
- render jank on chat, maps, lists, and modals
- resource-heavy desktop assumptions on mobile networks/devices
- excessive rerenders or layout thrash in mobile views

Questions:
- what feels broken but is actually slow?
- where is mobile performance hiding parity issues?
- what mobile-specific loading strategies are needed?

### 10) Platform-appropriate differences
Separate real parity failures from intentional adaptation.

Legitimate differences may include:
- full screen mobile sheets instead of centered modals
- simplified secondary actions in tight spaces
- native share or haptic integrations
- mobile-first bottom action placement

But these are **not** legitimate excuses for:
- missing capabilities
- missing validations
- missing confirmations
- dead empty states
- inaccessible creation flows
- hidden critical actions
- broken state updates

---

## Special attention areas

Audit especially carefully:
- settings/integrations
- imports
- invite/join flows
- chat
- tasks
- polls
- calendar
- places/maps
- payments
- AI concierge
- modal-heavy workflows
- confirmation and save feedback
- mobile home/dashboard refresh behavior

---

## Deliverables

Use this output structure:

### 1. Executive mobile parity diagnosis
Give a blunt assessment:
- Is mobile truly first-class, partially degraded, or clearly lagging?
- What works well?
- What feels broken or neglected?

### 2. Platform comparison map
Summarize:
- what web does
- what mobile/PWA does
- what native wrapper does if relevant
- where parity is strong vs weak

### 3. Top parity failures
Rank the biggest problems.

For each:
- problem
- affected flows/screens
- what differs across platforms
- why it matters
- severity: [low / medium / high / critical]

### 4. Intentional vs accidental differences
Separate:
- good platform adaptation
- accidental feature drift
- accidental UI drift
- bugs disguised as platform differences

### 5. Starter-state and creation-flow audit
Call out:
- blank states
- dead-end states
- hidden create actions
- missing starter scaffolds
- create/edit differences across platforms

### 6. Interaction and touch audit
Call out:
- risky tap targets
- destructive action placement
- poor mobile ergonomics
- feedback mismatches
- navigation/back behavior issues

### 7. Recommended parity roadmap
Group into:
- High-value / low-risk
- High-value / medium-risk
- Needs caution
- Leave alone for now

For each:
- exact change
- expected user payoff
- engineering risk
- whether it is parity, UX, or correctness work

### 8. If implementation was requested
If the user asked for changes:
- implement the smallest set of changes that creates the biggest real parity gain
- prefer canonical shared patterns
- avoid platform-specific one-offs unless necessary
- summarize exactly what changed

### 9. Verification
State:
- what screens/flows/components were compared
- what code paths were checked
- what remains unverified without runtime testing/screenshots

### 10. Follow-up opportunities
Only include the next 3 highest-leverage parity wins.

---

## Decision rules

### Parity beats convenience
Do not accept "mobile is different" as a justification unless the difference is clearly intentional and product-positive.

### Preserve platform fit
Do not force desktop UI onto mobile. Preserve capability, not necessarily identical layout.

### Starter states matter
Blank mobile screens are almost always a parity and UX failure unless explicitly intended.

### Confirmation parity matters
If web reassures users that an action succeeded, mobile should too.

### Canonical flows should stay canonical
If tasks/polls/calendar/payments belong to the same family, they should not diverge randomly by platform.

### Correctness over cosmetics
A stale or missing state update is more important than a minor spacing mismatch.

### Fix the highest-friction gaps first
Prioritize issues that:
- block core actions
- reduce trust
- create dead ends
- make mobile feel broken

---

## Constraints

- Do not propose a full mobile rewrite unless truly necessary.
- Do not confuse responsive layout differences with parity failures unless capability or clarity is harmed.
- Do not preserve broken mobile behavior because desktop works.
- Do not add platform-specific hacks that increase future drift.
- Be concrete, comparative, and opinionated.
- Optimize for first-class mobile product quality.

---

## Preferred mindset

Act like a product-minded mobile lead doing a parity review on an app that claims to be cross-platform.

You are asking:

**"Does mobile get the real product, or just a squeezed-down cousin of the web app?"**

Your job is to:
- find the gaps
- name which ones matter
- separate intentional adaptation from accidental drift
- restore first-class mobile quality
- keep future parity easier to maintain
