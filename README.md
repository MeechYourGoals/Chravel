# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/20feaa04-0946-4c68-a68d-0eb88cc1b9c4

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/20feaa04-0946-4c68-a68d-0eb88cc1b9c4) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Set up environment variables
cp .env.example .env
# Edit .env and add your API keys (see Environment Configuration section below)

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Capacitor (for native iOS/Android)
- Supabase (backend)

## Mobile App Development

Chravel is available as a native iOS and Android app powered by Capacitor.

**Key Mobile Features:**
- Native camera and photo integration
- Push notifications
- Haptic feedback
- Geolocation services
- Offline-first architecture
- Background sync

**Build Instructions:**

For detailed iOS App Store submission guide, see: [IOS_APP_STORE_GUIDE.md](IOS_APP_STORE_GUIDE.md)

For production build checklist, see: [PRODUCTION_BUILD_CHECKLIST.md](PRODUCTION_BUILD_CHECKLIST.md)

For screenshot guide, see: [APP_STORE_SCREENSHOTS.md](APP_STORE_SCREENSHOTS.md)

**Quick Start:**
```bash
# Add native platforms
npx cap add ios
npx cap add android

# Build web assets
npm run build

# Sync to native platforms
npx cap sync

# Open in native IDEs
npx cap open ios      # Requires Xcode (Mac only)
npx cap open android  # Requires Android Studio
```

**Mobile Architecture:**
- Mobile-specific routing with conditional rendering
- Touch-optimized UI (44px+ touch targets)
- Service Worker for offline support
- Virtual scrolling for performance
- Zero impact on desktop/web experience

For complete mobile readiness report, see: [MOBILE_READINESS.md](MOBILE_READINESS.md)

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/20feaa04-0946-4c68-a68d-0eb88cc1b9c4) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## 🚀 **Developer Resources**

**For comprehensive development documentation, see:**
- **[DEVELOPER_HANDBOOK.md](DEVELOPER_HANDBOOK.md)** - Complete developer guide
- **[PRODUCTION_CLEANUP_SUMMARY.md](PRODUCTION_CLEANUP_SUMMARY.md)** - Recent improvements
- **[production-ready-codebase.plan.md](production-ready-codebase.plan.md)** - Production roadmap

## 🔧 **Environment Configuration**

### Required for Local Development

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

**Critical Frontend Variables:**
- `VITE_GOOGLE_MAPS_API_KEY` – **Required** for Places tab and map features
  - Get from: https://console.cloud.google.com/apis/credentials
  - Enable: Maps JavaScript API, Places API, Geocoding API
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` – Required for database connection
- `VITE_STREAM_API_KEY` – Required for chat features

**Backend/Supabase Functions Variables:**
- `LOVABLE_API_KEY` – Required for AI Concierge powered by Google Gemini
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` – Allow functions to read/write data

Set these variables when running `supabase functions serve` locally.
When deploying, set the same variables using `supabase secrets set`.

### Troubleshooting

**Maps not loading?**
1. Verify `VITE_GOOGLE_MAPS_API_KEY` is set in `.env`
2. Ensure the API key has the following APIs enabled:
   - Maps JavaScript API
   - Places API
   - Geocoding API
3. Restart the development server after adding/changing environment variables

## Claude Code

Run `npm run claude` to launch Claude Code for advanced code analysis and MCP integration. See [docs/claude-code.md](docs/claude-code.md) for setup details.

## 🔌 **Render MCP Integration**

Chravel now supports the Render Model Context Protocol (MCP) server, enabling you to manage Render infrastructure directly from Cursor using natural language.

**Capabilities:**
- Create and manage web services, static sites, and databases
- Monitor logs and analyze service metrics in real-time
- Query Render Postgres databases directly
- Update service configurations and environment variables

**Setup:**
1. The MCP configuration is already set up in `.cursor/mcp_config.json`
2. **Restart Cursor** for the changes to take effect
3. Use natural language prompts like "Show me my Render services" or "What's the CPU usage?"

For complete documentation, see: [docs/RENDER_MCP_INTEGRATION.md](docs/RENDER_MCP_INTEGRATION.md)