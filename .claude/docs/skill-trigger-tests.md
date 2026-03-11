# Skill Trigger Tests

Validation matrix for all custom skills. Each entry shows when the skill SHOULD and SHOULD NOT trigger.

> Last updated: 2026-03-11

---

## Global Skills

### debug-systematically
| Should Trigger | Should NOT Trigger |
|---|---|
| "Why is this broken?" | "Add a new feature" |
| "This doesn't work" | "Refactor the auth module" |
| "Investigate this error" | "Write tests for this" |
| "Debug the trip loading issue" | "Deploy to production" |
| **Risk:** May overtrigger on general "fix this" requests that are simple one-liners. |

### test-first-bugfix
| Should Trigger | Should NOT Trigger |
|---|---|
| "Fix this bug" | "Add a button to the page" |
| "This broke after the last change" | "Write a new component" |
| "Regression in trip loading" | "Refactor this function" |
| "The payment balance is wrong" | "How does this work?" |
| **Risk:** May undertrigger when user says "fix" without "bug". May clash with `debug-systematically`. Resolution: `debug-systematically` investigates; `test-first-bugfix` adds the reproduction test and fix. |

### architecture-audit
| Should Trigger | Should NOT Trigger |
|---|---|
| "Audit the architecture" | "Fix this bug" |
| "Is this well-structured?" | "Add a new endpoint" |
| "Review the tech debt" | "Run the tests" |
| "How should we organize this module?" | "Change the button color" |
| **Risk:** Low. Clear trigger language. |

### regression-containment
| Should Trigger | Should NOT Trigger |
|---|---|
| "What could break if I change this?" | "Write a new test" |
| "Is this safe to change?" | "Add documentation" |
| "Blast radius of this PR" | "How does this work?" |
| "Impact analysis for the auth refactor" | "Deploy to staging" |
| **Risk:** May overtrigger on any cautious question. Acceptable — better safe than sorry. |

### dependency-and-hooks-audit
| Should Trigger | Should NOT Trigger |
|---|---|
| "Why is this re-rendering?" | "Add a new page" |
| "Infinite loop in useEffect" | "Fix the CSS" |
| "Stale closure bug" | "Update the README" |
| "Check the dependency arrays" | "Deploy" |
| **Risk:** May overtrigger on general React questions. Keep focused on hooks/effects. |

### refactor-safely
| Should Trigger | Should NOT Trigger |
|---|---|
| "Refactor the auth module" | "Fix this bug" |
| "Extract this into a shared component" | "Add a feature" |
| "Reorganize the file structure" | "Debug this error" |
| "Clean up this module" | "Write tests" |
| **Risk:** Low. Clear trigger language. |

### dead-code-cleanup
| Should Trigger | Should NOT Trigger |
|---|---|
| "What's unused in this module?" | "Add a feature" |
| "Clean up dead code" | "Refactor this" |
| "Remove unused imports" | "Fix a bug" |
| **Risk:** Low. Very specific trigger. |

### mobile-parity-audit
| Should Trigger | Should NOT Trigger |
|---|---|
| "Does this work on mobile?" | "Fix the desktop layout" |
| "PWA audit" | "Add a backend endpoint" |
| "Check touch targets" | "Database migration" |
| **Risk:** Low. Platform-specific language is clear. |

### security-review
| Should Trigger | Should NOT Trigger |
|---|---|
| "Is this secure?" | "Add a button" |
| "Auth review" | "Fix the CSS" |
| "Vulnerability check" | "Deploy to staging" |
| **Risk:** Low. Security language is distinctive. |

### root-cause-analysis
| Should Trigger | Should NOT Trigger |
|---|---|
| "Why does this keep happening?" | "Add a feature" |
| "Post-mortem analysis" | "First-time bug fix" |
| "Five whys on this incident" | "Write a test" |
| **Risk:** May overlap with `debug-systematically`. Resolution: RCA is for recurring/systemic issues; debug is for any single bug. |

### implementation-plan
| Should Trigger | Should NOT Trigger |
|---|---|
| "Plan this feature" | "Fix this one-line bug" |
| "How should I build this?" | "What does this code do?" |
| "Break this down into steps" | "Run the tests" |
| **Risk:** May overtrigger on simple tasks. The "Do NOT use for single-file changes" guard helps. |

### pr-review-hard-mode (user-invoked only)
| Should Trigger | Should NOT Trigger |
|---|---|
| User types `/pr-review-hard-mode` | Never auto-triggers |
| **Risk:** None — user-invoked only. |

### ship-readiness (user-invoked only)
| Should Trigger | Should NOT Trigger |
|---|---|
| User types `/ship-readiness` | Never auto-triggers |
| **Risk:** None — user-invoked only. |

### docs-sync (user-invoked only)
| Should Trigger | Should NOT Trigger |
|---|---|
| User types `/docs-sync` | Never auto-triggers |
| **Risk:** None — user-invoked only. |

### prompt-optimizer (user-invoked only)
| Should Trigger | Should NOT Trigger |
|---|---|
| User types `/prompt-optimizer` | Never auto-triggers |
| **Risk:** None — user-invoked only. |

### learn-from-fixes (user-invoked only)
| Should Trigger | Should NOT Trigger |
|---|---|
| User types `/learn-from-fixes` | Never auto-triggers |
| **Risk:** None — user-invoked only. |

---

## Chravel Repo Skills

### chravel-no-regressions
| Should Trigger | Should NOT Trigger |
|---|---|
| "Will this break trips?" | "Add a new landing page" |
| "Is this safe for auth?" | "Update the README" |
| "Trip Not Found regression check" | "Style the footer" |
| Editing `useAuth`, `useTrip`, trip pages | Editing unrelated components |
| **Risk:** May overtrigger broadly. Acceptable — this is a guardrail skill. |

### chravel-supabase-rls
| Should Trigger | Should NOT Trigger |
|---|---|
| "Add RLS policy" | "Fix the UI" |
| "Permission denied from Supabase" | "Add a React component" |
| "Edge function for auth" | "CSS changes" |
| **Risk:** Low. Database/auth language is specific. |

### chravel-design-language
| Should Trigger | Should NOT Trigger |
|---|---|
| "Does this match our style?" | "Fix a logic bug" |
| "Premium dark theme" | "Database migration" |
| "Gold accent for this button" | "Auth flow change" |
| Building any new UI component | Backend-only changes |
| **Risk:** May undertrigger when user doesn't mention design but is building UI. Acceptable — the description mentions "building new UI". |

### chravel-gemini-live-debug
| Should Trigger | Should NOT Trigger |
|---|---|
| "Gemini Live bug" | "Fix the payment flow" |
| "Voice chat not working" | "CSS changes" |
| "Function calling issue" | "Trip loading bug" |
| **Risk:** Low. Gemini/voice language is specific. |

### chravel-ai-concierge
| Should Trigger | Should NOT Trigger |
|---|---|
| "Add a concierge tool" | "Fix the calendar" |
| "AI recommendation feature" | "Database migration" |
| "Trip assistant response" | "Auth flow" |
| **Risk:** May overlap with `chravel-gemini-live-debug`. Resolution: concierge is feature-level; gemini-debug is API/integration-level. |

### chravel-payments
| Should Trigger | Should NOT Trigger |
|---|---|
| "RevenueCat integration" | "Fix the map" |
| "Payment request bug" | "Chat rendering" |
| "Balance is wrong" | "Calendar event creation" |
| **Risk:** Low. Payment language is specific. |

### chravel-smart-import
| Should Trigger | Should NOT Trigger |
|---|---|
| "Smart import not parsing" | "Fix the chat" |
| "Import from email" | "Auth changes" |
| "Parse this PDF" | "Payment flow" |
| **Risk:** Low. Import language is specific. |

### chravel-performance-audit
| Should Trigger | Should NOT Trigger |
|---|---|
| "Why is trip loading slow?" | "Add a feature" |
| "Re-rendering too much" | "Fix a logic bug" |
| "Bundle size analysis" | "Design changes" |
| **Risk:** May overlap with `dependency-and-hooks-audit` for re-render issues. Resolution: performance-audit is broader (network, bundle, all perf); hooks-audit is React-specific. |

### chravel-mobile-pwa-parity
| Should Trigger | Should NOT Trigger |
|---|---|
| "Does this work on PWA?" | "Backend changes" |
| "Mobile layout broken" | "Database migration" |
| "Touch targets too small" | "Auth flow" |
| **Risk:** May overlap with global `mobile-parity-audit`. Resolution: chravel version has Chravel-specific page pairs and critical paths. |

### chravel-repo-map (auto, background context)
| Should Trigger | Should NOT Trigger |
|---|---|
| Never user-invoked — serves as background reference | N/A |
| **Risk:** None — `user-invocable: false` keeps it out of the menu. |

### chravel-architecture-audit
| Should Trigger | Should NOT Trigger |
|---|---|
| "How is Chravel structured?" | "Fix this one bug" |
| "Audit the feature modules" | "CSS changes" |
| "Tech debt in Chravel" | "Add a button" |
| **Risk:** May overlap with global `architecture-audit`. Resolution: Chravel version has Chravel-specific modules, paths, and critical path awareness. |

### chravel-bug-repro-first
| Should Trigger | Should NOT Trigger |
|---|---|
| "Bug in Chravel trip loading" | "Add a feature" |
| "Chravel regression" | "Refactor" |
| "Auth bug in Chravel" | "Design review" |
| **Risk:** May overlap with global `test-first-bugfix`. Resolution: Chravel version knows Chravel's test infrastructure, critical paths, and regression classes. |

### chravel-ui-consistency
| Should Trigger | Should NOT Trigger |
|---|---|
| "Visual drift between tabs" | "Fix a logic bug" |
| "Component consistency check" | "Database changes" |
| "Does this match our design system?" | "Auth flow" |
| **Risk:** May overlap with `chravel-design-language`. Resolution: design-language enforces tokens/values; ui-consistency audits cross-feature coherence. |

### chravel-release-readiness (user-invoked only)
| Should Trigger | Should NOT Trigger |
|---|---|
| User types `/chravel-release-readiness` | Never auto-triggers |
| **Risk:** None — user-invoked only. |

---

## Overlap Resolution Summary

| Overlapping Skills | Resolution |
|---|---|
| `debug-systematically` vs `test-first-bugfix` | Debug investigates; test-first adds test + fix |
| `debug-systematically` vs `root-cause-analysis` | Debug for any bug; RCA for recurring/systemic issues |
| `mobile-parity-audit` (global) vs `chravel-mobile-pwa-parity` | Global is generic; Chravel has repo-specific page pairs and paths |
| `architecture-audit` (global) vs `chravel-architecture-audit` | Global is generic; Chravel has feature module awareness |
| `test-first-bugfix` (global) vs `chravel-bug-repro-first` | Global is generic; Chravel knows the test infrastructure |
| `chravel-design-language` vs `chravel-ui-consistency` | Design language = tokens/values; UI consistency = cross-feature coherence |
| `chravel-gemini-live-debug` vs `chravel-ai-concierge` | Gemini = API/integration; Concierge = feature/product level |
| `dependency-and-hooks-audit` vs `chravel-performance-audit` | Hooks = React correctness; Performance = all perf including network/bundle |
| Superpowers `systematic-debugging` vs `debug-systematically` | Superpowers is plugin-managed; global skill is always available |
| Superpowers `test-driven-development` vs `test-first-bugfix` | TDD is for new features; test-first-bugfix is specifically for bugs |
