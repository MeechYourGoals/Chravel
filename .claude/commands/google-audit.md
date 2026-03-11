Perform a full Google stack audit for this feature/request.

Required workflow:
1. Research latest official Google docs first.
2. Check release notes, deprecations, migrations, supported models, lifecycle status, and setup requirements.
3. Check official examples/cookbooks.
4. Check forums/GitHub/Reddit/X only as secondary evidence.
5. Determine:
   - ship status
   - latest public production-suitable model(s)
   - unsupported combinations
   - Cloud Console setup requirements
   - OAuth / approval blockers
   - Supabase Edge Function boundaries
   - secret placement
6. Produce:
   - current truth
   - recommended model(s)
   - setup map
   - secret map
   - implementation plan
   - risks
   - rollback
7. If code changes are requested, inspect existing code before proposing edits.
8. Optimize for minimal safe diff and no dead code.
