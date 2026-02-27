# New User Onboarding UX Audit (Simulated)

## Scope
- Journey simulated: anonymous user landing on `/` (mobile 375x812), attempting auth, and reviewing invite/onboarding touchpoints from `Index`, `AuthModal`, `OnboardingCarousel`, and `JoinTrip`.
- Focus areas requested: confusion points, unclear CTAs, overloaded screens, missing empty states, emotional friction.

## Simulated Journey Notes
1. Land on marketing homepage with many navigation items + multiple conversion entry points.
2. Primary authentication entry copy varies across surfaces:
   - `Login or Signup`
   - `Sign up / Log in`
   - `Get Started Free · Log In or Sign Up` (legacy unauthenticated landing)
3. Auth modal opens with strong functionality (Google + email + mode switch), but copy hierarchy is generic (`Welcome Back`, `Create Account`) and does not reassure a first-time organizer what happens next.
4. In invite flow (`/join/:token`), state handling is robust but UX can still feel high-friction when users are bounced to auth and then returned.
5. Product onboarding carousel is feature-rich, but asks users to process six slides before action and has no inline “what you’ll do in next 30 seconds” framing.

## Findings

### 1) Confusion points
- **Inconsistent auth verb set** across landing and header causes decision friction (“login”, “sign up”, “get started” are used interchangeably without clear intent). 
- **Unclear first action after sign-up**: the app offers onboarding and demo exploration, but no concise statement of immediate value (“Create trip in 60 seconds” style guidance is missing).
- **Invite continuation mental model is implicit**: invite persistence exists technically, but users are not explicitly reassured that their invite will resume after auth.

### 2) Unclear CTAs
- **`Login or Signup`** is operational but weakly outcome-oriented.
- **`Explore demo trip`** in onboarding may compete with primary activation goal when shown with equal visual weight.
- **Auth tab labels (`Sign In`, `Sign Up`)** are clear, but top-level CTA language should map 1:1 to these terms.

### 3) Overloaded screens
- **Landing hero + nav + many sections** can feel information-dense for first-time mobile users who just want to start.
- **Onboarding carousel (6 steps)** can feel long before first “real” action.

### 4) Missing or weak empty states
- **No explicit “you’re new here” empty-state handoff** directly after account creation before trip creation starts.
- **Invite/auth handoff lacks explicit success continuity microcopy** (e.g., “You’ll return to your invite automatically”).

### 5) Emotional friction
- Users likely worry about commitment/effort because copy emphasizes breadth (many capabilities) before quick win.
- Error handling in invite flow is technically good, but tone can be improved to reduce blame/failure feeling and increase recovery confidence.

## Recommendations

### A) Microcopy improvements (highest leverage, low engineering cost)
1. Normalize top CTA language across all unauth surfaces:
   - Primary: **“Start free”**
   - Secondary inline text: **“Sign in or create account”**
2. Add short outcome copy under auth header:
   - Sign-up mode: **“Create a trip in under a minute. Invite your group with one link.”**
   - Sign-in mode: **“Welcome back—pick up where your trip left off.”**
3. Add invite continuity reassurance on auth redirect:
   - **“Your invite is saved. After sign in, we’ll bring you right back.”**
4. Reframe onboarding final CTAs:
   - Primary: **“Create my first trip”**
   - Secondary: **“Preview a sample trip first”**

### B) Micro-animation opportunities
1. **CTA confirmation pulse** after auth success (200–300ms scale + check) before modal close to reduce “did it work?” anxiety.
2. **Invite-resume transition chip** (“Returning to your invite…”) with subtle progress animation after auth.
3. **Onboarding progress momentum**: tiny forward slide + progress fill acceleration on screens 4→5→6 to signal completion is near.

### C) Simplification opportunities
1. **Mobile-first fast path on landing**:
   - Keep one sticky bottom CTA: “Start free”.
   - Collapse secondary nav depth until user scroll intent is clear.
2. **Compress onboarding from 6 to 4 slides** by merging overlapping value demos (chat + basecamp can be combined into one collaborative story).
3. **Post-signup first-run choice card** (single screen):
   - “Create new trip” (primary)
   - “Join with invite code”
   - “Explore demo”

## Suggested Prioritization
1. **P0 (this week)**: CTA copy normalization + invite continuity microcopy.
2. **P1**: onboarding slide compression + stronger final CTA wording.
3. **P2**: micro-animations for auth success and invite resume.

## Regression-safe rollout notes
- Start with copy-only changes behind existing components to avoid logic churn.
- Preserve existing auth/invite routing and sessionStorage behavior.
- Validate at 375px width and invite redirect flow (`/join/:token` → `/auth` → `/join/:token`).
