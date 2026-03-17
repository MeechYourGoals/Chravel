# New User Onboarding UX Audit (Simulated)

Date: 2026-02-27
Reviewer: AI agent heuristic walkthrough

## Scope of simulation

Simulated first-time user journey:
1. Marketing landing (`HeroSection`) → tap primary CTA
2. Auth entry (`AuthModal` / `AuthPage`) → account creation
3. Post-auth onboarding carousel (`OnboardingCarousel` + screens)
4. First dashboard state (`TripGrid` empty and filtered empty states)
5. Invite/deep-link side path (`JoinTrip`)

Notes:
- This is a UX heuristic audit based on source-level walkthrough, not production analytics.
- Focus: confusion points, CTA clarity, cognitive load, empty states, emotional friction.

## Findings

### 1) Confusion points

1. **CTA wording ambiguity at the top of funnel**
   - `Login or Signup` blends two different intents into one generic action.
   - New users lose confidence about "what happens next" (create account vs sign in).

2. **Competing branch paths at onboarding completion**
   - Final screen offers both `Create Your First Trip` and `Explore demo trip`, while onboarding can also be skipped from header/footer.
   - For first-time users, this creates decision fatigue before they’ve seen a real success state.

3. **Potential expectation mismatch in onboarding demos**
   - Animated mock screens show polished interactions (trip creation, chat/broadcast, AI recommendations) without explicit "demo preview" framing.
   - New users may assume all shown content is pre-populated in their own empty workspace immediately.

4. **Join-trip path has high state complexity**
   - Join flow handles many outcomes (invalid token, expired invite, requires approval, auto-join, auth redirect).
   - The amount of hidden branching is robust technically but can feel unpredictable emotionally without stronger progress messaging.

### 2) Unclear CTAs

1. **`Get Started` is overloaded**
   - Used in onboarding navigation and as a generic fallback action label in empty states.
   - Label doesn’t specify the concrete action (create trip, browse demo, or continue carousel).

2. **`Skip tour` appears twice in onboarding shell**
   - One icon button (X) and one text link in footer.
   - Duplicate escape hatches increase accidental exits and reduce progression completion.

3. **`Create Your First Trip` vs `Explore demo trip` hierarchy could be clearer**
   - Good dual-path concept, but second action should explicitly clarify "no commitment" and "sample data".

### 3) Overloaded screens

1. **Landing hero carries too many headline layers**
   - Primary headline + subtitle + brand lockup + secondary tagline + subheadline + preview image + CTA.
   - Information density is high before users understand one core job-to-be-done.

2. **Onboarding introduces many product surfaces in 6 steps**
   - Trip creation + chat + broadcasts + basecamp + AI concierge + final decision.
   - Good breadth, but cognitive load may be high for users seeking one immediate outcome (e.g., join an invite, create one simple trip).

### 4) Missing / weak empty states

1. **Empty states exist for trip lists but not enough “next best action” context by intent**
   - Current empty states are present and better than blank screens.
   - Opportunity: tailor copy by detected entry source (invite, organic signup, demo exit) so the first action feels personalized.

2. **No explicit reassurance state after onboarding skip**
   - Skipping immediately drops user into normal app context.
   - Missing “You can replay tour anytime” or “Start with this 1-minute setup” bridge can increase abandonment.

### 5) Emotional friction

1. **Early commitment pressure**
   - Users are asked to decide between creating real trip vs demo exploration before receiving a tiny “success” moment.

2. **Fear of doing it wrong**
   - Labels like `Create Your First Trip` are clear, but lack supporting confidence text (e.g., editable later, takes 30 seconds, no payment needed).

3. **Invite flow anxiety in edge cases**
   - When invite path requires approval or errors, user trust depends on supportive language and clear next timing expectations.

## Recommendations

### A) Microcopy improvements (high impact, low engineering cost)

1. **Landing CTA split**
   - Replace `Login or Signup` with two actions where possible:
     - Primary: `Create free account`
     - Secondary: `Sign in`
   - If only one CTA is possible, use: `Get started free`.

2. **Onboarding nav CTA specificity**
   - Replace generic `Get Started`/`Next` with contextual labels:
     - `See trip setup` → `See team chat` → `See AI planning` → `Choose your path`.

3. **Final CTA confidence boosters**
   - Under `Create Your First Trip`, add helper text: `Takes ~30 seconds. You can edit everything later.`
   - Rename `Explore demo trip` to `Try a sample trip first`.

4. **Skip reassurance**
   - After skip, show toast/banner: `Tour skipped. You can replay it from Settings anytime.`

5. **Invite status language**
   - For approval-required join: `Request sent — most hosts respond quickly. We'll notify you here and by email.`

### B) Micro-animation opportunities

1. **CTA continuity animation**
   - Animate pressed CTA into next screen header (shared element feel) to reduce perceived context-switch.

2. **Progress confidence in onboarding**
   - Add subtle percentage/progress label (`Step 2 of 6`) next to dots.
   - Keep motion low-amplitude to preserve accessibility and avoid distraction.

3. **Empty-state first-action pulse**
   - One-time gentle pulse/ring on primary empty-state CTA for first session only.

4. **Invite lifecycle feedback**
   - On `Join Trip`, animate button state transitions: `Joining...` → success checkmark/approval pending badge.

### C) Simplification opportunities

1. **Reduce hero message stack**
   - Keep one headline + one supporting sentence + one CTA above fold.
   - Move extra value props below fold.

2. **Compress onboarding from 6 to 4 slides for first-time path**
   - Merge overlapping concept slides (e.g., trip creation + basecamp; chat + broadcast).
   - Keep detail depth for optional "Learn more" mode.

3. **Single “skip” affordance**
   - Keep either top-right X or footer text, not both.

4. **Intent-aware first action on home**
   - If user entered via invite link recently, prioritize `Join your invited trip` over generic create-trip CTA.

## Prioritized rollout (suggested)

1. **P0 (this sprint):** CTA copy cleanup + skip reassurance + helper text under final CTA.
2. **P1:** Hero message simplification + onboarding step labels.
3. **P2:** Onboarding slide compression experiment (A/B), intent-aware empty state personalization.

## Success metrics to validate changes

- Onboarding completion rate
- First-trip creation rate within first session
- Demo-to-real conversion rate
- Invite-join completion rate
- Time-to-first-success (first trip created, first message sent, or invite accepted)
