---
name: agent-tooling-audit
description: Deep audit of AI agent architecture, tool usage, action safety, confirmation UX, orchestration quality, prompt boundaries, and mutation reliability. Use to evaluate whether an AI-powered product's tool-calling and agent flows are robust, safe, understandable, and scalable, then recommend or implement the highest-leverage fixes without breaking product behavior.
---

# agent-tooling-audit

You are performing an **agent tooling audit** on a production application with AI capabilities.

Your job is to inspect the architecture and UX of:
- tool calling
- agent orchestration
- model-to-tool boundaries
- mutation safety
- confirmation UX
- prompt boundaries
- provider abstraction
- action reliability
- observability and verification
- user trust in AI actions

This is not a general AI brainstorm.

This is a **systems audit** for whether the app's AI tooling is:
- safe
- coherent
- explainable
- reliable
- maintainable
- scalable

Default mode:
- inspect first
- map the agent/tool system
- identify structural weaknesses
- separate UX issues from tooling issues from trust-boundary issues
- recommend highest-leverage fixes
- preserve product behavior
- avoid hype or AI theater

If execution is explicitly requested, implement the highest-confidence, lowest-regret fixes first.

---

## Core objective

Determine whether the AI layer is an actual reliable product system or just a fragile demo with tool calls.

Audit these dimensions:

1. Tool boundary clarity
2. Mutation safety
3. User-visible confirmation reliability
4. Prompt and instruction containment
5. Orchestration quality
6. Error handling and recovery
7. Provider and integration abstraction
8. State synchronization after AI actions
9. Observability and verification
10. Scalability of agent workflows over time
11. **Evaluation framework** (AgentOps 4-layer):
    - Component testing: individual tool/function unit tests
    - Trajectory review: multi-step action sequence correctness
    - Outcome validation: end-to-end result verification
    - Production monitoring: runtime metrics, latency, error rates
12. **Cross-provider interoperability**: model/provider swap readiness, adapter boundaries

---

## What to audit aggressively

### 1) Tool inventory and ownership
Look for:
- too many overlapping tools
- tools with fuzzy responsibilities
- one tool doing too many unrelated things
- the same mutation available through multiple paths
- no clear naming scheme
- feature logic embedded inside prompts instead of code
- hidden coupling between tools and UI components
- tools that exist but are not actually wired
- mock placeholder tools or UI buttons

Questions:
- what tools exist?
- what does each one own?
- where are responsibilities duplicated or unclear?

### 2) Read vs write boundary
Look for:
- tools that both read and mutate without clear separation
- model decisions directly mutating state without guardrails
- weak distinction between suggestion and action
- tools returning ambiguous results after writes
- no canonical mutation wrapper
- actions happening without an explicit post-write verification path
- model claiming completion before the system verifies success

Questions:
- which tools can change state?
- how is mutation distinguished from analysis?
- how is a successful write actually confirmed?

### 3) Action confirmation reliability
Look for:
- AI saying "done" when no write occurred
- success messages with no visible evidence
- different confirmation patterns across tool actions
- no summary card or confirmation artifact after writes
- multi-item actions flooding the UI with noisy confirmations
- mobile/web using different confirmation logic
- created items not surfacing where users expect them

Questions:
- how does the user know the AI actually did the thing?
- is confirmation coupled to verified state change or just model text?
- what is the canonical pattern for tool-action confirmation?

### 4) Prompt leakage and instruction contamination
Look for:
- model exposing raw instructions
- tool payloads leaking into chat
- chain-of-thought-like artifacts surfacing accidentally
- malformed markdown/code showing in user responses
- internal schemas or prompts visible to users
- system prompt fragments appearing in answers
- rich card formatting replaced by broken debug text
- changes that caused the assistant to "talk like the prompt"

Questions:
- where can internal instructions leak?
- which boundaries between agent internals and user output are weak?
- what rendering safeguards are missing?

### 5) Tool-call orchestration quality
Look for:
- poor sequencing of tools
- tool loops with weak termination
- actions happening in the wrong order
- lack of precondition checks
- lack of dependency checks
- multi-step actions not decomposed cleanly
- model deciding too much in natural language instead of structured workflow
- weak handoff from planning to execution to verification

Questions:
- can the agent reliably do multi-step work?
- where does orchestration become brittle?
- what should be encoded as deterministic flow instead of prompt behavior?

### 6) Error handling and recovery
Look for:
- silent failures
- generic fallback text masking tool errors
- no user-visible partial-success reporting
- tools failing without retry logic where appropriate
- failure states that do not preserve user trust
- UI not differentiating between "not attempted," "attempted and failed," and "completed"
- no repair path when one step in a chain fails

Questions:
- what happens when a tool fails?
- can users tell what succeeded vs failed?
- can the system recover gracefully?

### 7) State synchronization after tool actions
Look for:
- tool writes succeeding but UI not refreshing
- stale caches after mutations
- newly created items not visible
- list/detail views showing inconsistent truth
- web and mobile syncing differently after AI actions
- optimistic updates disconnected from real backend confirmation
- imports or created items not attached to the right entity/trip/context

Questions:
- does the UI reflect the post-tool truth?
- what invalidation or refresh rules are missing?
- where does the model get blamed for a state-sync bug?

### 8) Tool safety and guardrails
Look for:
- mutation tools with weak auth or ownership checks
- no constraint on scope of actions
- destructive actions too easy to trigger
- bulk actions without clear summarization or confirmation
- unsafe parameter handling
- tools accepting ambiguous or underspecified context
- model deciding between risky options without enough structure

Questions:
- can the tool do more than it should?
- are risky actions scoped tightly enough?
- where are guardrails too weak or too scattered?

### 9) Provider and integration boundaries
Look for:
- provider-specific logic leaking everywhere
- prompts tightly coupled to one vendor
- tool definitions mixed with UI rendering logic
- AI provider assumptions embedded across many files
- difficult model/provider swap path
- inconsistent handling across Gemini/OpenAI/other providers
- no adapter boundary around tool outputs

Questions:
- how portable is the agent architecture?
- where is provider lock-in technical debt growing?
- what should be normalized earlier?

### 10) Observability and debugging
Look for:
- no clear logs of tool-call attempts and outcomes
- weak visibility into why agent actions failed
- no durable record of action planning vs execution vs verification
- hard-to-debug multi-step flows
- lack of correlation IDs / action IDs / traceable event chains
- UI/debug mismatch between what the agent thought and what occurred

Questions:
- can engineers explain failed agent behavior?
- can you distinguish prompt issues from tool issues from state issues?
- what instrumentation is missing?

### 11) UX trustworthiness of agent behavior
Look for:
- AI overclaiming confidence
- assistant speaking as if an action is complete before verification
- no disclosure between "suggested," "prepared," and "executed"
- tool actions not surfacing enough detail for trust
- confirmation UX too noisy or too vague
- AI behavior that feels magical until it breaks

Questions:
- does the user trust the AI for the right reasons?
- where is the product faking competence instead of proving it?
- what canonical trust language should exist?

---

## Special attention areas

Audit especially carefully:
- import flows
- calendar creation/update
- places saves
- task and poll creation
- payments mutations
- share/invite flows
- AI concierge tool calling
- multi-step agent workflows
- rich card rendering
- confirmation cards
- mobile vs web action feedback
- any feature where the AI says it did something

---

## Deliverables

Use this output structure:

### 1. Executive agent tooling diagnosis
Give a blunt assessment:
- Is the agent layer robust, fragile, or demo-grade?
- What is working well?
- What is actively risky?

### 2. Agent/tool system map
Summarize:
- available tools
- major read vs write paths
- orchestration flow
- confirmation flow
- UI rendering path after tool actions

### 3. Top tooling failures
Rank the biggest issues.

For each:
- problem
- affected files/flows
- failure mode
- why it matters
- severity: [low / medium / high / critical]

### 4. Read/write boundary audit
Call out:
- unclear mutations
- ambiguous tool results
- missing verification steps
- model text overstating execution

### 5. Confirmation and trust audit
Call out:
- missing or weak confirmations
- noisy confirmations
- invisible writes
- overclaiming language
- state-sync mismatches after actions

### 6. Prompt/render boundary audit
Call out:
- prompt leakage
- malformed output
- broken markdown/card rendering
- internal text escaping into user-facing responses

### 7. Recommended target architecture
Describe the healthier structure for:
- tool definitions
- orchestration
- mutation wrappers
- verification steps
- UI confirmation system
- provider adapters
- instrumentation/debug visibility

### 8. Tooling roadmap
Group into:
- High-value / low-risk
- High-value / medium-risk
- Needs caution
- Leave alone for now

For each:
- exact change
- why it helps
- risk level
- expected payoff

### 9. If implementation was requested
If the user asked for changes:
- implement the highest-confidence improvements first
- prioritize guardrails, confirmation reliability, and state-sync correctness
- summarize exactly what changed

### 10. Verification
State:
- what code paths were audited
- what tool flows were checked
- what remains unverified without runtime traces/tests

### 11. Follow-up opportunities
Only include the next 3 highest-leverage fixes.

---

## Decision rules

### Verified writes beat model narration
Never let model language be the main source of truth for whether an action succeeded.

### Separate suggestion from mutation
The user should be able to tell whether the AI:
- suggested something
- prepared something
- executed something
- verified something

### Canonical confirmation patterns matter
Equivalent AI actions should use a consistent confirmation system.

### Deterministic flow beats prompt magic
If a workflow is repeated and important, encode more of it in structured logic, not just prompt text.

### Minimize overlapping tools
Prefer fewer, clearer tools with strong contracts over many fuzzy tools.

### Tighten write boundaries
Mutation tools should have:
- clear inputs
- clear scope
- clear result objects
- clear post-write verification

### Protect the render boundary
Never leak prompts, schemas, internal instructions, or tool payload artifacts into user-facing responses.

### Debuggability matters
If engineers cannot explain why an agent action failed, the architecture is not good enough.

---

## Constraints

- Do not recommend AI theater or unnecessary complexity.
- Do not preserve ambiguous tool boundaries because they are convenient.
- Do not rely on prompt-only fixes for structural tool problems.
- Do not conflate UI bugs with orchestration bugs without evidence.
- Do not propose a full rewrite unless absolutely necessary.
- Be concrete, skeptical, and systems-minded.

---

## Preferred mindset

Act like a principal engineer auditing whether an AI product actually deserves user trust.

You are asking:

**"Is this an agent system with real contracts and verification, or just fancy text wrapped around fragile tool calls?"**

Your job is to:
- find the fragility
- reduce ambiguity
- tighten write boundaries
- improve user trust
- improve debugging
- make the AI layer feel real because it is real
