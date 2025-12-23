# CHRAVEL CODEBASE COMPREHENSIVE MAP

## Executive Summary
- **Total Files**: ~699 TypeScript/TSX files
- **Components**: 406+ component files organized by feature domain
- **Services**: 80+ service files with specialized business logic
- **Custom Hooks**: 80+ reusable React hooks
- **Type Definitions**: 28 type files with comprehensive schemas
- **Architecture**: React 18 + TypeScript + Supabase + Zustand + TanStack Query
- **Routing**: React Router v6 with 20+ pages and lazy loading
- **UI Framework**: Radix UI components with Tailwind CSS

---

## 1. PROJECT STRUCTURE OVERVIEW

```
/home/user/Chravel/
├── src/
│   ├── components/          # 406+ component files (34 subdirectories)
│   ├── pages/              # 24 page components (routing layer)
│   ├── services/           # 80+ service files
│   ├── hooks/              # 80+ custom React hooks
│   ├── types/              # 28 type definition files
│   ├── utils/              # 31 utility/helper files
│   ├── integrations/       # External service integrations
│   │   └── supabase/       # Database types and client
│   ├── contexts/           # React contexts (3 files)
│   ├── store/              # Zustand stores
│   ├── stores/             # Additional Zustand stores
│   ├── config/             # Configuration files
│   ├── constants/          # Constants and enums
│   ├── data/               # Mock data and fixtures
│   ├── mockData/           # Test/demo data
│   ├── lib/                # Library utilities
│   ├── App.tsx             # Main app component with routing
│   ├── main.tsx            # Entry point
│   └── index.css            # Global styles
├── supabase/               # Supabase migrations and SQL
└── public/                 # Static assets
```

---

## 2. ROUTING STRUCTURE

### Main Routes (App.tsx)
**20+ Routes using React Router v6**

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Index.tsx | Home/Dashboard - trip listings, view modes |
| `/trip/:tripId` | TripDetail.tsx | Consumer trip detail view |
| `/trip/:tripId/edit-itinerary` | ItineraryAssignmentPage.tsx | Itinerary assignment UI |
| `/join/:token` | JoinTrip.tsx | Join trip via invite token |
| `/tour/pro/:proTripId` | ProTripDetail.tsx | Professional tour detail |
| `/event/:eventId` | EventDetail.tsx | Event detail page |
| `/search` | SearchPage.tsx | Universal search interface |
| `/recs` | ChravelRecsPage.tsx | AI recommendations page |
| `/profile` | ProfilePage.tsx | User profile settings |
| `/settings` | SettingsPage.tsx | Account/app settings |
| `/archive` | ArchivePage.tsx | Archived trips view |
| `/organizations` | OrganizationsHub.tsx | Organization listing |
| `/organization/:orgId` | OrganizationDashboard.tsx | Org dashboard |
| `/accept-invite/:token` | AcceptOrganizationInvite.tsx | Org invite acceptance |
| `/advertiser` | AdvertiserDashboard.tsx | Advertiser backend |
| `/admin/scheduled-messages` | AdminDashboard.tsx | Admin panel |
| `/healthz` | Healthz.tsx | API health check |

**Router Configuration**:
- Uses `HashRouter` in Lovable preview, `BrowserRouter` in production
- Lazy loading with `retryImport` function for resilience
- `LazyRoute` wrapper component for error boundaries
- Chunk load failure recovery with toast notifications

---

## 3. COMPONENT ARCHITECTURE

### Component Organization by Domain (34 Subdirectories)

#### Core UI Components (`/ui`)
- **51 Radix UI-based components**: button, card, dialog, dropdown, forms, input, modals, tabs, toast, etc.
- Tailwind CSS styling with consistent design system
- Components: accordion, alert, avatar, badge, breadcrumb, button, calendar, carousel, chart, checkbox, command, context-menu, dialog, drawer, dropdown, form, hover-card, input, label, pagination, popover, progress, radio, scroll-area, select, separator, slider, switch, tabs, toggle, tooltip

#### Feature Domains

**Trip Management** (`/trip`)
- `TripDetailHeader.tsx` - Trip header/metadata
- `TripDetailContent.tsx` - Main trip display
- `TripCategorySelector.tsx` - Category/type selector
- `TripExportModal.tsx` - PDF/document export
- `CollaboratorsGrid.tsx` & `CollaboratorsModal.tsx` - Team member management
- `TripTasksUpdated.tsx` - Task management

**Professional/Pro Trips** (`/pro`)
- `ProTripDetailHeader.tsx` - Pro trip header
- `ProTripDetailContent.tsx` - Pro trip main view
- `ProTabsConfig.tsx` & `ProTabNavigation.tsx` - Tab configuration and navigation
- `RoleSwitcher.tsx` - Role switching UI
- `TeamTab.tsx` - Team management
- `CategorySelector.tsx` & `CategoryTags.tsx` - Category assignment
- `RoomAssignmentsModal.tsx` - Accommodation assignments
- `OrgChartNode.tsx` & `TeamOrgChart.tsx` - Organizational hierarchy
- `ExportTeamDirectoryModal.tsx` - Team export
- `EditMemberRoleModal.tsx` & `BulkRoleAssignmentModal.tsx` - Role management
- `QuickContactMenu.tsx` - Contact shortcuts
- `ProTripQuickActions.tsx` - Action shortcuts
- `TeamOnboardingBanner.tsx` - Onboarding flow

**Pro Channels & Communication** (`/pro/channels`)
- `ChannelsPanel.tsx` - Channel list/sidebar
- `ChannelChatView.tsx` - Channel message display
- `ChannelSelector.tsx` - Channel selection
- `NewChannelModal.tsx` - Create channel
- `ChannelMembersModal.tsx` - Manage channel members
- `AdminRoleManager.tsx` - Admin controls for roles
- `DirectChannelView.tsx` - DM view
- `ChannelMessagePane.tsx` - Message input/display

**Pro Team Views** (`/pro/team`)
- `ChannelsView.tsx` - Channels management
- `RolesView.tsx` - Roles and permissions

**Chat Components** (`/chat`)
- `ChatMessages.tsx` - Message list
- `ChatInput.tsx` - Message composition
- `MessageBubble.tsx` - Message display
- `MessageRenderer.tsx` - Rich message rendering
- `VirtualizedMessageContainer.tsx` - Performance-optimized message list
- `AiChatInput.tsx` - AI chat input
- `ChannelSwitcher.tsx` - Channel selection
- `StreamMessageWithReactions.tsx` - Stream Chat integration
- `MessageReactionBar.tsx` - Emoji reactions

**Media Management** (`/media`)
- Photo/video upload and display
- Media URL management
- Aggregated media hub

**Events** (`/events`)
- Event creation/editing
- Event display
- Event calendar integration
- Event setup forms

**Payments** (`/payments`)
- Payment splits
- Payment methods
- Payment processing UI

**Home/Dashboard** (`/home`)
- `TripGrid.tsx` - Trip cards display
- `DesktopHeader.tsx` - Desktop header
- `TripStatsOverview.tsx` - Statistics
- `TripViewToggle.tsx` - View mode switching
- `RecommendationFilters.tsx` - Filter controls

**Mobile Components** (`/mobile`)
- `MobileAppLayout.tsx` - Main mobile layout
- `MobileHeader.tsx` - Mobile header
- `AuthPromptBanner.tsx` - Auth encouragement
- Mobile-specific responsive views

**Settings** (`/settings`)
- `ConsumerSettings.tsx` - Consumer settings
- `EnterpriseSettings.tsx` - Enterprise settings
- `EventsSettings.tsx` - Events settings

**Conversion/Marketing** (`/conversion`)
- `PersistentCTABar.tsx` - Call-to-action banner
- `PricingSection.tsx` - Pricing display
- `FeatureShowcase.tsx` - Feature highlights
- `SocialProofSection.tsx` - Social proof/testimonials
- `DemoModal.tsx` - Demo mode selector

**AI/Concierge** (`/ai`)
- `AIConciergeChat.tsx` - AI chat interface
- `UniversalTripAI.tsx` - AI trip assistant
- `AICalendarDetector.tsx` - Auto-calendar detection

**Places** (`/places`)
- Google Places integration
- Location selection
- Venue/place search

**Other Domains**
- `/poll` - Polling/voting
- `/calendar` - Calendar views and management
- `/broadcast` - Announcements/broadcasts
- `/notifications` - Notification UI
- `/profile` - User profile
- `/forms` - Reusable form components
- `/tour` - Tour/guide system
- `/share` - Sharing functionality
- `/todo` - Task management
- `/receipts` - Receipt management
- `/achievements` - Gamification
- `/invite` - Invite/team joining
- `/advertiser` - Advertiser dashboard
- `/enterprise` - Enterprise features
- `/consumer` - Consumer-specific UI
- `/safety` - Safety/security features
- `/travel` - Travel booking integration

#### Large Components in Root
- `CreateTripModal.tsx` (14.8 KB) - Trip creation dialog
- `EditTripModal.tsx` (11.3 KB) - Trip editing
- `BasecampSelector.tsx` (20.4 KB) - Basecamp/location selection
- `AddPlaceModal.tsx` (14.9 KB) - Place addition
- `UpgradeModal.tsx` (30.5 KB) - Subscription upgrade flow
- `UniversalSearchResultsPane.tsx` (5.0 KB) - Search results
- `UnifiedMediaHub.tsx` (5.5 KB) - Media management

---

## 4. STATE MANAGEMENT PATTERNS

### Zustand Stores (Lightweight, File-Based)

**In `/store`**:
- `demoModeStore.ts` - Demo mode toggle state

**In `/stores`**:
- `locationStore.ts` - Current location/basecamp

### Type-Based State Stores (In `/types`)
- `tripContext.ts` - Trip context and state
- `consumer.ts` - Consumer subscription/profile state
- `enterprise.ts` - Enterprise features state
- `events.ts` - Events data state
- `payments.ts` - Payments state
- `pro.ts` - Pro trip state
- `messages.ts` - Messaging state
- `channels.ts` - Channel state
- `ai.ts` - AI/grounding state
- `media.ts` - Media management state
- `broadcasts.ts` - Broadcast state
- `categoryAssignments.ts` - Category assignments
- `eventSetup.ts` - Event setup
- `grounding.ts` - AI grounding data
- `roleChannels.ts` - Role-based channels

### React Context (In `/contexts`)
- `BasecampContext.tsx` - Basecamp/location context
- `DataSourceContext.tsx` - Data source (real/mock)
- `TripVariantContext.tsx` - Trip variant selection

### TanStack Query (React Query)
- Used throughout for server state management
- Query client configured in `App.tsx`
- Custom hooks often use `useQuery` and `useMutation`

### Auth Context (In `/hooks`)
- `useAuth.tsx` - Authentication and user state
- Manages Supabase auth session
- User profile transformation and caching

---

## 5. SERVICES LAYER (80+ Services)

### Organization Services
- `tripService.ts` - CRUD operations for trips
- `organizationService.ts` - Organization management
- `basecampService.ts` - Basecamp/location management

### Communication Services
- `chatService.ts` - Chat messaging (Supabase)
- `channelService.ts` (16 KB) - Channel management with roles
- `unifiedMessagingService.ts` (10.5 KB) - Unified message handling
- `broadcastService.ts` - Announcement/broadcast system
- `roleBroadcastService.ts` - Role-specific broadcasts

### Data Services
- `tripContextAggregator.ts` (15.5 KB) - Complex trip data aggregation
- `enhancedTripContextService.ts` (17 KB) - Enhanced context with roles
- `tripSpecificMockDataService.ts` (38.9 KB) - Demo data

### Mock/Demo Services
- `demoModeService.ts` (22 KB) - Demo mode logic and data
- `mockDataService.ts` (29 KB) - Mock trip/event data
- `mockKnowledgeService.ts` (10.9 KB) - Mock AI knowledge
- `UniversalMockDataService.ts` (8.5 KB) - Unified mock data
- `mockEmbeddingService.ts` (10 KB) - Mock embeddings

### AI/Knowledge Services
- `universalConciergeService.ts` (8.1 KB) - AI concierge logic
- `knowledgeGraphService.ts` (5.7 KB) - Knowledge graph integration
- `conciergeRateLimitService.ts` (6.7 KB) - Rate limiting for AI
- `mockKnowledgeService.ts` - Mock knowledge base

### Integration Services
- `googleMapsService.ts` (8.2 KB) - Google Maps API
- `googlePlaces.ts` (6.6 KB) - Google Places API
- `googleCalendarService.ts` (5.3 KB) - Google Calendar sync
- `travelBooking.ts` (8.2 KB) - Travel booking integration
- `runwareService.ts` (5.8 KB) - Image generation (Runware AI)

### Media & Storage Services
- `uploadService.ts` - File uploads
- `mediaSync.ts` - Media synchronization
- `chatUrlExtractor.ts` - URL extraction from messages
- `linkService.ts` - Link management
- `calendarStorageService.ts` - Local calendar storage

### Notification Services
- `notificationService.ts` (7.2 KB) - Generic notifications
- `productionNotificationService.ts` (10.7 KB) - Production notifications
- `useProductionNotifications.ts` - Production notification hook

### Payment Services
- `paymentService.ts` (9.1 KB) - Payment processing
- `paymentBalanceService.ts` (7.9 KB) - Balance calculations
- `travelWalletService.ts` (4.5 KB) - Wallet/budget tracking

### Specialized Services
- `calendarService.ts` (6.5 KB) - Calendar operations
- `eventChannelService.ts` (7.0 KB) - Event-specific channels
- `gamificationService.ts` (6.4 KB) - Achievement system
- `roleChannelService.ts` (5.5 KB) - Role-based channel management
- `roleTemplateService.ts` (7.2 KB) - Role templates
- `privacyService.ts` - Privacy/data management
- `secureStorageService.ts` - Encrypted storage
- `errorTracking.ts` (5.0 KB) - Error monitoring
- `hapticService.ts` - Haptic feedback (mobile)
- `apiHealthCheck.ts` (7.6 KB) - API status monitoring

### Mobile Services (Web-first, native via Capacitor when enabled)
- `mobileLocationService.ts` (6.3 KB) - GPS/location (web geolocation API)
- `nativeMobileService.ts` (10.4 KB) - Platform detection stubs
- `capacitorIntegration.ts` (5.2 KB) - Web-first implementation with native hook points
- `mobileOptimizationService.ts` (4.5 KB) - Mobile web performance

### Performance Services
- `performanceService.ts` (4.5 KB) - Performance monitoring
- `performanceMonitoring.ts` (9 KB) - Detailed metrics
- `realtimeOptimizations.ts` - Real-time performance

### Utility Services
- `archiveService.ts` - Archive management
- `taskStorageService.ts` - Task persistence
- `pollStorageService.ts` - Poll storage
- `savedRecommendationsService.ts` - Save recommendations
- `userPreferencesService.ts` - User preferences
- `urlUtils.ts` - URL utilities
- `teamDirectoryExportService.ts` (10 KB) - Team export

### Messaging Services (`/services/messaging`)
- Stream Chat integration for real-time messaging

---

## 6. CUSTOM HOOKS (80+ React Hooks)

### Authentication & Authorization
- `useAuth.tsx` - Auth context and user state
- `useConsumerSubscription.tsx` - Subscription status
- `useFeatureFlags.ts` - Feature flag management
- `useFeatureToggle.ts` - Feature toggles

### Trip Management
- `useTrips.ts` - Fetch/manage trips
- `useTripForm.ts` - Trip creation/editing form
- `useTripMedia.ts` - Trip media operations
- `useTripMembers.ts` - Trip collaborators
- `useTripPolls.ts` - Poll management
- `useTripTasks.ts` (18.7 KB) - Task management
- `useTripChat.ts` (6.6 KB) - Trip chat operations
- `useTripCoverPhoto.ts` - Cover image management
- `useTripPreferences.ts` - Trip preferences
- `useTripPoster.ts` - Trip poster generation

### Chat & Messaging
- `useChatComposer.ts` (4.7 KB) - Message composition
- `useChatMessageParser.ts` - Message parsing
- `useChannels.ts` (5.9 KB) - Channel operations
- `useUnifiedMessages.ts` (5.1 KB) - Unified message handling
- `useRoleChannels.ts` (4.7 KB) - Role-based channels

### Calendar & Events
- `useCalendarEvents.ts` - Event fetching
- `useCalendarManagement.ts` (6.3 KB) - Event operations
- `useGameSchedule.ts` - Sports scheduling
- `useShowSchedule.ts` - Show scheduling

### Broadcast & Notifications
- `useBroadcasts.ts` (4.6 KB) - Broadcast management
- `useBroadcastComposer.ts` - Broadcast creation
- `useBroadcastFilters.ts` - Broadcast filtering
- `useBroadcastReactions.ts` - Broadcast reactions
- `useNotifications.ts` (3.3 KB) - Notification handling
- `useNotificationPreferences.ts` (4 KB) - Notification settings
- `useProductionNotifications.ts` (4.5 KB) - Production notifications
- `usePullToRefresh.ts` - Pull-to-refresh gesture

### Forms & Validation
- `useFormValidation.ts` (3.7 KB) - Zod schema validation
- `useTripForm.ts` - Trip form validation

### Search & Filtering
- `useUniversalSearch.ts` (4.9 KB) - Unified search
- `useSearchFilters.ts` (6 KB) - Filter management
- `useLocationFilteredRecommendations.ts` - Geo filtering

### Media & Files
- `useMediaManagement.ts` (8 KB) - Photo/video operations
- `useMediaSync.ts` (4.6 KB) - Media synchronization
- `useShareAsset.ts` (4.7 KB) - Asset sharing
- `useStorageQuota.ts` - Storage usage tracking

### Payment & Commerce
- `usePayments.ts` (3.7 KB) - Payment operations
- `usePaymentSplits.ts` (4.4 KB) - Split payments
- `useTravelWallet.ts` (5.2 KB) - Budget/wallet

### Organizational Features
- `useOrganization.ts` (5.1 KB) - Organization data
- `useCollaboratorManagement.ts` - Team management
- `useBulkRoleAssignment.ts` - Bulk role assignment
- `useOrgChartData.ts` - Org chart generation
- `useRoleChannels.ts` - Role channel management
- `useCategoryAssignments.ts` (4 KB) - Category assignments
- `useCategoryManagement.ts` - Category operations
- `useCategoryTasks.ts` - Category task assignment

### AI & Knowledge
- `useConciergeUsage.ts` (5.4 KB) - AI usage tracking
- `useEmbeddingGeneration.tsx` (4.1 KB) - Embedding operations
- `useGroundingOptimization.ts` (3.6 KB) - AI grounding

### UI & Mobile
- `use-mobile.tsx` - Responsive design detection
- `useIsMobile.tsx` - Mobile detection
- `useSafeArea.ts` - Safe area insets
- `useMobilePortrait.ts` - Portrait orientation
- `useOrientation.ts` - Device orientation
- `useVirtualScroll.ts` - Virtual scrolling
- `usePinchZoom.ts` - Pinch zoom gesture
- `useLongPress.ts` - Long press detection
- `useSwipeGesture.ts` - Swipe gestures
- `useKeyboardHandler.ts` (3.4 KB) - Keyboard shortcuts

### Utilities
- `useDemoMode.ts` - Demo mode toggle
- `use-toast.ts` - Toast notifications
- `useInviteLink.ts` (5.5 KB) - Invite generation
- `usePlaceResolution.ts` - Place/location resolution
- `usePlacesLinkSync.ts` (5.4 KB) - Places link synchronization
- `useSavedRecommendations.ts` - Saved recommendations
- `useOfflineStatus.ts` - Offline detection
- `useApiHealth.tsx` (2.9 KB) - API health check
- `useRetryableMutation.ts` (3.7 KB) - Retry logic
- `useRealtimeOptimizations.ts` (6.4 KB) - Real-time performance
- `useSubscription.ts` - Subscription status
- `useAccommodations.ts` (3.4 KB) - Accommodation data
- `usePollManager.ts` - Poll operations
- `useInviteLink.ts` - Invite link generation

---

## 7. TYPE SYSTEM (28 Type Files)

### Core Type Files
| File | Purpose | Lines |
|------|---------|-------|
| `index.ts` | Central re-exports | 13 |
| `pro.ts` | Professional tour types | ~200+ |
| `tripContext.ts` | Trip context and state | ~100+ |
| `messages.ts` | Messaging types | ~100+ |
| `payments.ts` | Payment schemas | ~100+ |
| `events.ts` | Event types | ~100+ |
| `consumer.ts` | Consumer subscription | ~100+ |
| `enterprise.ts` | Enterprise features | ~100+ |
| `channels.ts` | Channel management | ~100+ |
| `ai.ts` | AI/knowledge types | ~50+ |
| `media.ts` | Media handling | ~50+ |
| `accommodations.ts` | Lodging types | ~40+ |
| `basecamp.ts` | Basecamp types | ~40+ |
| `calendar.ts` | Calendar types | ~30+ |
| `categoryAssignments.ts` | Role categories | ~50+ |
| `eventSetup.ts` | Event configuration | ~60+ |
| `proCategories.ts` | Pro role categories | ~80+ |
| `roleChannels.ts` | Role-based channels | ~100+ |
| `privacy.ts` | Privacy/data types | ~60+ |
| `receipts.ts` | Receipt types | ~30+ |
| `grounding.ts` | AI grounding types | ~40+ |
| `messaging.ts` | Message types | ~30+ |
| `imports.ts` | Data import types | ~30+ |
| `tripExport.ts` | Trip export types | ~70+ |
| `advertising.ts` | Advertiser types | ~80+ |
| `google-maps.d.ts` | Google Maps ambient types | - |
| `paymentMethods.ts` | Payment method IDs | ~10 |
| `tasks.ts` | Task types | ~30+ |

### Supabase Integration
- `integrations/supabase/types.ts` (2,870 lines)
  - Auto-generated from Supabase schema
  - Complete database type definitions
  - Ensures type safety for all queries

### Key Type Structures in `pro.ts`
- `Tour` - Tour/trip metadata
- `TourTrip` - Individual tour stop
- `TeamMember` - Participant data
- `ProParticipant` - Enhanced participant with roles/hierarchy
- `RoomAssignment` - Hotel room allocation
- `ProSchedule` - Event scheduling
- `PerDiemData` - Per diem/daily allowance
- `SettlementData` - Venue settlement
- `MedicalLog` - Health records
- `ComplianceRule` - Compliance tracking
- `MediaSlot` - Media allocation

---

## 8. UTILITIES & HELPERS (31 Files)

### Formatting & Transformation
- `dateFormatters.ts` - Date/time formatting
- `nameFormatUtils.ts` - Name formatting
- `teamDisplayUtils.ts` - Team display formatting
- `schemaAdapters.ts` (4.3 KB) - Data schema adapters
- `categoryMapper.ts` - Category mapping
- `avatarUtils.ts` (2 KB) - Avatar generation
- `tourDataConverter.ts` - Tour data transformation

### Calculation & Analytics
- `tripStatsCalculator.ts` (5 KB) - Trip statistics
- `tripStatsUtils.ts` (5.1 KB) - Statistics utilities
- `distanceCalculator.ts` (3.9 KB) - Distance calculations
- `analytics.ts` (2 KB) - Analytics tracking
- `featureTiers.ts` - Feature tier detection
- `tripTierDetector.ts` - Trip tier/level detection

### Performance & Optimization
- `performanceMonitor.ts` (2 KB) - Performance tracking
- `performanceMonitoring.ts` (9 KB) - Detailed monitoring
- `imageOptimization.ts` - Image compression/optimization
- `concurrencyUtils.ts` (6 KB) - Async concurrency helpers

### PDF & Export
- `exportPdfClient.ts` (13.7 KB) - Client-side PDF generation
- `calendarExport.ts` (3.9 KB) - Calendar export
- `download.ts` - Download utilities

### Security & Privacy
- `securityUtils.ts` (3.4 KB) - Security helpers
- `paymentDeeplinks.ts` - Payment link generation

### Utilities & Helpers
- `env.ts` - Environment detection
- `demoMode.ts` - Demo mode helpers
- `roleUtils.ts` (2.8 KB) - Role management
- `tripLabels.ts` - Trip labeling
- `smartInputDetector.ts` (3.1 KB) - Input type detection
- `mockAvatars.ts` (2.4 KB) - Mock avatar generation
- `errorTracking.ts` (1.9 KB) - Error tracking setup
- `serviceWorkerRegistration.ts` (4.8 KB) - PWA registration

---

## 9. INTEGRATION POINTS

### Supabase (PostgreSQL + Auth)
**Location**: `/src/integrations/supabase/`

**Features**:
- User authentication (email, phone, OAuth)
- Real-time subscriptions to database changes
- Row-level security (RLS) policies
- Vector search (embeddings)
- Edge functions (serverless)

**Main Client**: `client.ts` (59 lines)
- Configures supabase-js client
- Handles localStorage safely
- Supports preview environments
- Environment-based credentials

**Schema**: `types.ts` (2,870 lines)
- Auto-generated Supabase types
- Complete table/view definitions
- Ensures compile-time safety

**Key Tables Used**:
- `profiles` - User profiles
- `trips` - Trip management
- `trip_members` - Team membership
- `trip_admins` - Admin roles
- `trip_channels` - Communication channels
- `channel_messages` - Chat messages
- `broadcasts` - Announcements
- `events` - Event management
- `payments` - Payment tracking
- `pro_trips` - Professional tours
- (And 20+ more domain-specific tables)

### Google Maps & Places
**Services**: 
- `googleMapsService.ts` - Core Maps API
- `googlePlaces.ts` - Places API and autocomplete

**Features**:
- Interactive map rendering
- Place search and autocomplete
- Location markers and overlays
- Route calculation
- Geolocation support

**Components Used**:
- `@googlemaps/js-api-loader` for loading
- Custom map containers in trip views
- Places autocomplete in forms

### Google Calendar
**Service**: `googleCalendarService.ts`
- Calendar event creation
- Event synchronization
- iCal export support

### Stream Chat (Real-time Messaging)
**Libraries**:
- `stream-chat-react` (13.2.1)
- `stream-chat` (9.10.0)

**Features**:
- Real-time team messaging
- Channel management
- Message reactions
- Typing indicators
- Read receipts

**Components**: Chat subsystem in `/components/chat/`

### Stripe (Payment Processing)
**Config**: `/src/constants/stripe.ts`
- Payment method IDs
- Subscription tiers
- Webhook handling

### Mobile (Capacitor - Same Codebase)
**Purpose**: Package the React web app as iOS/Android apps with access to native capabilities via plugins
**Status**: Planned / in progress
**Web Fallbacks**:
- Camera → file input with capture attribute
- Geolocation → browser geolocation API
- Share → Web Share API + clipboard fallback
- Storage → localStorage
- Haptics → navigator.vibrate on supported browsers

### Runware (AI Image Generation)
**Service**: `runwareService.ts`
- AI-powered image generation
- Used for trip poster creation

---

## 10. STATE MANAGEMENT PATTERNS

### Pattern 1: Service + Hook Pattern
```typescript
// Service (business logic)
// services/tripService.ts
export const tripService = {
  async getTrips(userId) { ... },
  async createTrip(tripData) { ... }
}

// Hook (React integration)
// hooks/useTrips.ts
export function useTrips() {
  return useQuery(['trips'], () => tripService.getTrips());
}

// Component
// components/TripGrid.tsx
function TripGrid() {
  const { data: trips } = useTrips();
}
```

### Pattern 2: Zustand Store
```typescript
// store/demoModeStore.ts
export const useDemoModeStore = create((set, get) => ({
  isDemoMode: false,
  init: async () => { ... },
  toggle: async () => { ... }
}));

// Usage
const { isDemoMode, toggle } = useDemoModeStore();
```

### Pattern 3: React Context + Provider
```typescript
// contexts/BasecampContext.tsx
const BasecampContext = createContext();
export const BasecampProvider = ({ children }) => (
  <BasecampContext.Provider value={...}>
    {children}
  </BasecampContext.Provider>
);

// Usage
const basecamp = useContext(BasecampContext);
```

### Pattern 4: TanStack Query (React Query)
```typescript
// Global QueryClient in App.tsx
const queryClient = new QueryClient();

// Custom hooks
function useTrips() {
  return useQuery({
    queryKey: ['trips'],
    queryFn: () => tripService.getTrips()
  });
}

function useCreateTrip() {
  return useMutation(
    (data) => tripService.createTrip(data),
    { onSuccess: () => queryClient.invalidateQueries(['trips']) }
  );
}
```

### Pattern 5: Mock Data for Demo Mode
```typescript
// services/demoModeService.ts & mockDataService.ts
if (isDemoMode) {
  // Return mock data from static files
  return tripsData;
} else {
  // Fetch from Supabase
  return supabase.from('trips').select();
}
```

---

## 11. DATA FLOW PATTERNS

### Real-time Subscription Flow
```
Supabase RealtimeChannel → useEffect → Service → Hook → Component
```

### API Query Flow
```
Component Hook → TanStack Query → Service → Supabase → Cache → UI
```

### State Update Flow (Optimistic)
```
User Action → Update UI immediately → Send to Backend → Confirm/Rollback
```

### Demo Mode Flow
```
App Init → useDemoModeStore.init() → demoModeService → return isDemo
  → Conditional rendering in components
  → Alternative: Show mock data vs. real data
```

---

## 12. ARCHITECTURAL OBSERVATIONS & PATTERNS

### Strengths
1. **Clear Separation of Concerns**
   - Services handle business logic
   - Hooks handle state and side effects
   - Components focus on rendering

2. **Feature-Based Organization**
   - Components grouped by domain (trip, pro, events, etc.)
   - Easy to locate feature code
   - Supports team scaling

3. **Type Safety**
   - Full TypeScript strict mode
   - Supabase auto-generated types
   - Comprehensive type definitions for all domains

4. **Performance Optimizations**
   - Lazy loading of pages with retry logic
   - Virtual scrolling for large lists
   - Memoization of expensive operations
   - Service worker for PWA support

5. **Mobile-First Design**
   - PWA support for web
   - Mobile-specific layouts and components
   - Responsive Tailwind CSS
   - Native mobile packaging via Capacitor (same codebase)

6. **Demo Mode System**
   - Comprehensive mock data
   - Toggleable demo/production modes
   - Entire feature trees supported in demo

### Potential Redundancy Areas (For Code Audit)
1. **Multiple Mock Data Services**
   - `mockDataService.ts`
   - `demoModeService.ts`
   - `tripSpecificMockDataService.ts`
   - `UniversalMockDataService.ts`
   - Could be consolidated

2. **Similar Storage Services**
   - `taskStorageService.ts`
   - `pollStorageService.ts`
   - `chatStorage.ts`
   - Potential shared abstraction

3. **Duplicate Calculation Logic**
   - `tripStatsCalculator.ts`
   - `tripStatsUtils.ts`
   - Could merge into single utility

4. **Multiple Calendar Services**
   - `calendarService.ts`
   - `calendarStorageService.ts`
   - `googleCalendarService.ts`
   - Some overlap possible

5. **Role/Channel Duplication**
   - `roleChannelService.ts`
   - `channelService.ts`
   - `roleTemplateService.ts`
   - Potential consolidation

6. **Performance Monitoring**
   - `performanceService.ts`
   - `performanceMonitoring.ts`
   - `performanceMonitor.ts`
   - Three similar files

7. **Notification Services**
   - `notificationService.ts`
   - `productionNotificationService.ts`
   - `useProductionNotifications.ts`
   - Overlapping concerns

8. **Location/Place Services**
   - `googlePlaces.ts`
   - `mobileLocationService.ts`
   - `usePlacesLinkSync.ts`
   - Could be unified

---

## 13. TECHNICAL STACK

### Core Framework
- **React** 18.3.1 - UI library
- **TypeScript** 5.5.3 - Type safety
- **Vite** 5.4.1 - Build tool
- **React Router** 6.26.2 - Routing

### State Management
- **Zustand** 5.0.6 - Simple state store
- **TanStack React Query** 5.56.2 - Server state
- **React Context** - Local state

### UI & Styling
- **Radix UI** (20+ components) - Accessible component library
- **Tailwind CSS** 3.4.11 - Utility-first CSS
- **Lucide React** 0.462.0 - Icon library
- **Embla Carousel** 8.3.0 - Carousel component

### Integrations
- **Supabase** 2.53.0 - Backend as a Service
- **Google Maps** (@googlemaps/js-api-loader 1.16.10)
- **Stream Chat** (9.10.0, 13.2.1) - Real-time chat

### Forms & Validation
- **React Hook Form** 7.53.0 - Form state
- **Zod** 3.23.8 - Schema validation
- **Hookform Resolvers** 3.9.0 - Form validation adapters

### Export & Document Generation
- **jsPDF** 3.0.3 - PDF generation
- **html2canvas** 1.4.1 - Screenshot to canvas
- **XLSX** 0.18.5 - Excel export

### Utilities
- **date-fns** 3.6.0 - Date manipulation
- **clsx** 2.1.1 - Class name utilities
- **recharts** 2.12.7 - Charting library
- **idb** 8.0.3 - IndexedDB wrapper
- **sonner** 2.0.6 - Toast notifications
- **react-dropzone** 14.3.8 - File uploads
- **vaul** 0.9.3 - Drawer component

### Development
- **ESLint** 9.9.0 - Linting
- **Prettier** 3.1.0 - Code formatting
- **Vitest** 1.6.1 - Unit testing
- **TypeScript ESLint** 8.46.2 - TS linting
- **Husky** 8.0.3 - Git hooks

---

## 14. DIRECTORY SIZE & COMPLEXITY

### Largest Components (by file size)
1. `UpgradeModal.tsx` - 30.5 KB (subscription flow)
2. `tripSpecificMockDataService.ts` - 38.9 KB (demo data)
3. `demoModeService.ts` - 22 KB (demo logic)
4. `mockDataService.ts` - 29 KB (mock data)
5. `basecampService.ts` - 20.4 KB (location selection)
6. `enhancedTripContextService.ts` - 17 KB (context aggregation)
7. `tripContextAggregator.ts` - 15.5 KB (context building)

### Most Complex Services
1. `channelService.ts` (16 KB) - Role-based channels
2. `ProTripDetailContent.tsx` (multiple tabs)
3. `AdminRoleManager.tsx` (29.6 KB) - Role management UI
4. `useTripTasks.ts` (18.7 KB) - Task management hook

---

## 15. KEY FILE DEPENDENCIES

### App Initialization Flow
```
main.tsx
  → App.tsx (routing setup)
    → AppInitializer (setup hooks)
      → MobileAppLayout
        → Routes/Pages
```

### Authentication Flow
```
Index.tsx (dashboard)
  → useAuth() hook
    → AuthProvider (context)
      → Supabase auth session
        → User profile fetch
          → Profile transformation
```

### Trip Detail Flow
```
App.tsx (route)
  → LazyRoute (error boundary)
    → TripDetail.tsx (page)
      → useAuth() (check user)
      → useTripChat() (messages)
      → useTripTasks() (tasks)
      → useMediaManagement() (photos)
      → useCalendarManagement() (events)
      → Sub-components (tabs, modals)
```

---

## 16. CONFIGURATION FILES

- `vite.config.ts` - Build configuration
- `tsconfig.json` - TypeScript settings (strict mode enabled)
- `tailwind.config.ts` - Tailwind CSS configuration
- `eslint.config.js` - Linting rules
- `.prettierrc` - Code formatting
- `components.json` - UI component library config
- `vercel.json` - Deployment configuration
- `.env.example` & `.env.production.example` - Environment variables

---

## 17. BUILD & DEPLOYMENT

### Build Process
```bash
npm run build
  → npm run typecheck (TypeScript validation)
  → vite build (Vite bundling)
  → Production-optimized output to dist/
```

### Scripts Available
- `npm run dev` - Local development
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run lint` - Fix linting issues
- `npm run typecheck` - Type checking
- `npm run preview` - Preview production build
- `npm run ios:build` - Build for iOS
- `npm run ios:run` - Build and run on iOS

### Deployment
- **Platform**: Vercel
- **Node Version**: 18+
- **Build Command**: `npm run build`
- **Output**: `dist/` directory
- **Service Worker**: PWA support enabled

---

## 18. SUMMARY OF FINDINGS

**Total Codebase Size**: ~699 TS/TSX files

**Distribution**:
- Components: 406 files (58%)
- Services: 80 files (11%)
- Hooks: 80 files (11%)
- Types: 28 files (4%)
- Utils: 31 files (4%)
- Pages: 24 files (3%)
- Config/Constants/Other: 50 files (9%)

**Architecture Style**: Service-oriented with feature-based component organization

**Key Strengths**:
- Type-safe throughout
- Clear separation of concerns
- Comprehensive demo mode system
- Mobile-first responsive design
- Real-time capabilities

**Recommended Audit Focuses**:
1. Mock data service consolidation (4 similar files)
2. Storage service abstraction (3 similar files)
3. Performance monitoring unification (3 files)
4. Statistics calculation deduplication (2 files)
5. Role/channel service merging potential
6. Notification service consolidation
7. Location service unification

---

**Last Generated**: 2025-11-04
**Codebase Status**: Active production application
**Development Team**: Multi-feature, organized by domain
