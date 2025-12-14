# Chravel

Chravel is an AI-native platform for group travel + events coordination (chat, itineraries, tasks/polls, media, payments, maps, AI concierge).

### Quickstart (web)

```bash
npm install
cp .env.example .env
npm run dev
```

### Required environment variables (frontend)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_MAPS_API_KEY` (Places + Maps UI)

Additional keys are documented in `ENVIRONMENT_SETUP_GUIDE.md`.

### Common commands

```bash
npm run lint:check
npm run typecheck
npm run build
```

### Project layout (high-signal)

- `src/main.tsx`: app bootstrap + providers
- `src/App.tsx`: routing and app shell
- `src/components/`: UI + feature components
- `src/hooks/`: client hooks (TanStack Query + local state helpers)
- `src/services/`: service layer (Supabase access, domain logic, integrations)
- `supabase/functions/`: edge functions (Deno)
- `supabase/migrations/`: DB schema migrations

### Handoff docs (start here)

- `docs/HANDOFF.md`: engineering handoff + deployment/runbook context
- `docs/ARCHITECTURE.md`: system architecture
- `ENVIRONMENT_SETUP_GUIDE.md`: required services + keys
- `PRODUCTION_BUILD_CHECKLIST.md`: production readiness checklist
- `IOS_APP_STORE_GUIDE.md`: iOS release guide (Capacitor)

### Mobile (Capacitor)

```bash
npm run build
npx cap sync
npx cap open ios      # macOS + Xcode required
npx cap open android  # Android Studio required
```
