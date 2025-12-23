=== MSPEC START ===

# CHRAVEL iOS MASTER SPECIFICATION (MSPEC)
## Complete Technical Deconstruction for iOS Native Conversion

**Version:** 1.0  
**Source Repository:** Chravel React/TypeScript Web Application  
**Target Platform:** iOS Native (Swift/SwiftUI)  
**Generated:** November 2025

---

## 1. COMPLETE FEATURE INVENTORY

### 1.1 Core User Workflows

#### Authentication & Onboarding
- **Email/Password Sign-In** - Traditional authentication with Supabase
- **Phone OTP Sign-In** - SMS-based one-time password authentication
- **Google OAuth** - Social sign-in via Google
- **Apple Sign-In** - Native Apple authentication (critical for iOS)
- **Sign-Up Flow** - Email registration with first/last name capture
- **Password Reset** - Email-based password recovery
- **Profile Setup Modal** - First-time user profile completion
- **Demo Mode** - Unauthenticated preview mode with mock data

#### Trip Management (Consumer)
- **Trip Creation** - Create new trips with name, description, dates, destination
- **Trip List View** - Grid/list view of all user trips with filtering
- **Trip Detail View** - Full trip experience with tabs (Chat, Media, Pay, Calendar, AI)
- **Trip Archiving** - Soft-delete/archive trips
- **Trip Categories** - Tag trips by type (Work, Leisure, Family, Music, Sports, etc.)
- **Trip Stats Overview** - Dashboard showing trip statistics
- **Trip Invite System** - Share trip via invite link/code

#### Pro Trip Management (Enterprise)
- **Pro Trip Creation** - Enhanced trip type for professional teams/tours
- **Roster Management** - Team member management with roles
- **Room Assignments** - Accommodation allocation
- **Schedule Management** - Load-in, soundcheck, show times
- **Per Diem Tracking** - Daily allowance management
- **Settlement Calculations** - Financial reconciliation
- **Medical Logs** - Health tracking (privacy-restricted)
- **Compliance Rules** - NCAA, Union, Safety, Legal, Insurance tracking
- **Media Slots** - Interview/photo-shoot scheduling
- **Sponsor Activations** - Brand deliverable tracking

#### Event Management
- **Event Creation** - Create professional events (conferences, festivals)
- **Track Management** - Multiple event tracks/sessions
- **Speaker/Performer Profiles** - Talent management
- **Session Scheduling** - Time-blocked agenda
- **Sponsor Tiers** - Platinum/Gold/Silver/Bronze sponsors
- **Exhibitor Management** - Booth assignments
- **Attendee RSVPs** - Going/Maybe/Not-Going tracking
- **Check-In System** - Event attendance tracking

### 1.2 Group Chat/Message Flows

#### Trip Chat (Consumer)
- **Real-time Messaging** - WebSocket-based live chat
- **Message Types** - Text, Broadcast, Payment, System
- **Message Attachments** - Images, Videos, Files, Links
- **Message Reactions** - Emoji reactions with counts
- **@Mentions** - User tagging with notifications
- **Reply Threading** - Reply-to context
- **Message Edit/Delete** - Soft-delete with "[Message deleted]"
- **Link Preview** - OG metadata extraction
- **Read Receipts** - Message seen tracking

#### Pro Channels (Enterprise)
- **Role-Based Channels** - Channels filtered by role/department
- **Custom Channels** - User-created topic channels
- **Channel Permissions** - Can read/write/manage
- **Channel Stats** - Member count, message count, unread
- **Archived Channels** - Soft-archive support

### 1.3 Links, Polls, Tasks

#### Links
- **Add Link Modal** - Manual link addition with metadata
- **Link Card Display** - OG preview cards
- **Link Categories** - Restaurant, Activity, Accommodation, etc.
- **Link Voting** - Upvote/downvote links
- **Places Integration** - Google Places-sourced links

#### Polls
- **Poll Creation** - Question with multiple options
- **Anonymous Voting** - Optional anonymous mode
- **Poll Results** - Real-time vote counts
- **Poll Status** - Open/Closed/Archived
- **Standardized Poll Component** - Reusable across features

#### Tasks
- **Task Creation** - Title, description, due date
- **Task Assignment** - Assign to trip members
- **Task Status** - Per-user completion tracking
- **Task Polling** - Tasks can be polls
- **Due Date Reminders** - Calendar integration

### 1.4 Payment/Budget System

#### Payment Methods
- **Supported Methods** - Venmo, Zelle, CashApp, Apple Pay, PayPal, Apple Cash, Cash
- **User Payment Preferences** - Preferred method storage
- **Method Visibility** - Show/hide specific methods

#### Payment Splits
- **Split Types** - Equal, Custom, Percentage
- **Payment Messages** - In-chat payment requests
- **Settlement Tracking** - Mark as paid/settled
- **Receipt Attachment** - OCR-parsed receipts
- **Balance Summary** - Per-user balance calculations
- **Settlement Suggestions** - Optimized payment graph

#### Budget Tracking
- **Expense Categories** - Transportation, Accommodation, Food, Activities, Shopping, Misc
- **Budget vs Spent** - Category-level tracking
- **Currency Support** - Multi-currency with conversion
- **Receipt OCR** - AI-powered receipt parsing

### 1.5 Media Management

#### Photo/Video
- **Media Upload** - Camera capture + library selection
- **Media Gallery** - Grid view with selection
- **Media Metadata** - EXIF, location, tags
- **AI Auto-Tagging** - ML-based content tagging
- **Media Search** - Search by content/tags
- **Duplicate Detection** - Hash-based deduplication
- **Storage Quotas** - Tier-based limits (500MB free, 50GB paid)

#### Files
- **File Upload** - Document attachment support
- **File Preview** - In-app document viewing
- **File Categories** - Documents, PDFs, Spreadsheets

### 1.6 Calendar & Itinerary

#### Itinerary Builder
- **Day-by-Day Planning** - Chronological event list
- **Event Types** - Activity, Restaurant, Transportation, Accommodation
- **Drag-and-Drop Reordering** - Interactive scheduling
- **Conflict Detection** - Overlapping event warnings
- **Multi-Timezone Support** - Travel-aware time display

#### Calendar Integration
- **Google Calendar Sync** - Two-way sync
- **Apple Calendar Sync** - Native iOS calendar
- **Outlook Calendar Sync** - Microsoft integration
- **Event Reminders** - 15-minute push notifications
- **Add to Calendar Button** - Single-event export

### 1.7 Navigation Patterns

#### Bottom Tab Navigation (Mobile)
- **Chat Tab** - Trip messaging
- **Media Tab** - Photos, Videos, Files, Links
- **Pay Tab** - Payments and budget
- **Calendar Tab** - Itinerary and schedule
- **AI Tab** - AI Concierge

#### Top Navigation (Desktop)
- **Trip Header** - Trip name, dates, participants
- **Settings Menu** - Profile, preferences, billing
- **Search Overlay** - Global trip search
- **Notifications Panel** - In-app notification center

### 1.8 AI Integrations

#### AI Concierge
- **Context-Aware Q&A** - RAG over trip data
- **Trip Planning Suggestions** - Activity recommendations
- **Message Analysis** - Sentiment and intent extraction
- **Calendar Detection** - Extract dates from chat
- **Todo Generation** - AI-suggested tasks
- **Receipt Parsing** - Expense extraction from images

#### AI Features by Tier
- **Free Tier** - 5 queries per trip
- **Explorer Tier** - 10 queries per trip
- **Frequent Chraveler** - Unlimited AI access

### 1.9 Pro/Enterprise Features

#### Organization Management
- **Organization Dashboard** - Org overview and settings
- **Member Invitation** - Email/role-based invites
- **Seat Management** - License allocation
- **Role Hierarchy** - Owner > Admin > Member
- **Billing Portal** - Stripe subscription management

#### Pro-Specific Features
- **Broadcast Messaging** - Priority FYI/Urgent broadcasts
- **Role-Based Channels** - Department-specific chat
- **Team Directory Export** - CSV/Excel export
- **Compliance Tracking** - Rule status monitoring
- **Settlement Calculator** - Tour finance tools

---

## 2. SCREEN LIST + FULL UI HIERARCHY

### 2.1 Authentication Screens

#### AuthModal
- **Description:** Full-screen modal for sign-in/sign-up
- **Child Components:**
  - EmailSignInForm
  - PhoneSignInForm
  - SocialSignInButtons (Google, Apple)
  - SignUpForm
  - ForgotPasswordForm
- **Interaction Zones:**
  - Tab switcher (Sign In / Sign Up)
  - Form inputs with validation
  - Submit buttons with loading states
  - Social auth buttons
- **Modals/Sheets:** None (is a modal)
- **Dynamic UI:** Tab content switches between forms

#### ProfileSetupModal
- **Description:** First-time profile completion
- **Child Components:**
  - AvatarUploader
  - NameInputs (First, Last, Display)
  - BioTextarea
- **Interaction Zones:**
  - Avatar tap to upload
  - Text inputs
  - Complete button

### 2.2 Home/Dashboard Screens

#### Index (Home)
- **Description:** Main trip list/dashboard
- **Child Components:**
  - DesktopHeader (desktop only)
  - TripViewToggle (myTrips, tripsPro, events, travelRecs)
  - TripActionBar (settings, create, search, notifications)
  - TripStatsOverview
  - TripGrid
  - RecommendationFilters
  - SearchOverlay
  - DemoModeSelector
- **Interaction Zones:**
  - View mode tabs
  - Create trip FAB
  - Trip card taps
  - Search trigger
  - Filter pills
- **Modals/Sheets:**
  - CreateTripModal
  - UpgradeModal
  - SettingsMenu
  - AuthModal
  - DemoModal
  - ProfileSetupModal
- **Dynamic UI:** Grid adapts to view mode selection

### 2.3 Trip Detail Screens

#### TripDetail (Router)
- **Description:** Responsive wrapper routing to mobile/desktop
- **Child Components:**
  - MobileTripDetail (mobile)
  - TripDetailDesktop (desktop)

#### MobileTripDetail
- **Description:** Mobile trip experience with swipeable tabs
- **Child Components:**
  - MobileTripHeader (sticky)
  - MobileTripTabs (Chat, Media, Pay, Calendar, AI)
  - MobileTripInfoDrawer (bottom sheet)
- **Interaction Zones:**
  - Back button
  - More options menu
  - Tab swipe/tap
  - Info button for drawer
- **Modals/Sheets:**
  - MobileTripInfoDrawer (trip details)
- **Dynamic UI:** Tab content panels

#### TripDetailDesktop
- **Description:** Full desktop trip experience
- **Child Components:**
  - TripDetailHeader
  - TripHeader
  - TripDetailContent (tabbed)
  - MessageInbox
  - TripDetailModals
- **Interaction Zones:**
  - Tab navigation
  - Inbox toggle
  - Invite button
  - Settings button

### 2.4 Pro Trip Screens

#### ProTripDetail (Router)
- **Description:** Responsive wrapper for Pro trips
- **Child Components:**
  - MobileProTripDetail
  - ProTripDetailDesktop

#### ProTripDetailDesktop
- **Description:** Enterprise trip dashboard
- **Child Components:**
  - ProTripDetailHeader
  - ProTabsConfig (Team, Schedule, Admin, Chat, Media, Pay, AI)
  - TeamTab
  - ChannelsList
  - AdminDashboard
- **Interaction Zones:**
  - Tab navigation
  - Team member cards
  - Channel selection
  - Admin controls

### 2.5 Event Screens

#### EventDetail
- **Description:** Event management dashboard
- **Child Components:**
  - EventDetailContent
  - TripHeader
  - TripDetailModals
- **Interaction Zones:**
  - Schedule view
  - Speaker cards
  - Session taps
  - RSVP buttons

#### MobileEventDetail
- **Description:** Mobile event experience
- **Child Components:**
  - EventHeader
  - EventTabs (Schedule, Speakers, Sponsors, Chat)

### 2.6 Settings & Profile Screens

#### SettingsMenu (Sheet/Modal)
- **Description:** Full settings panel
- **Child Components:**
  - ConsumerSettings
  - EnterpriseSettings
  - Tab switcher (Consumer, Enterprise, Events)
- **Sections:**
  - Profile
  - Notifications
  - AI Concierge
  - Privacy
  - Billing
  - Saved Recommendations

#### ProfilePage
- **Description:** User profile dashboard
- **Child Components:**
  - Avatar display
  - Stats grid
  - SavedPlacesInline
  - Quick actions (Photos, Archive, Share)
  - Recent activity list

### 2.7 Organization Screens

#### OrganizationsHub
- **Description:** List of user's organizations
- **Child Components:**
  - OrganizationCard (for each org)
  - Create org button

#### OrganizationDashboard
- **Description:** Single organization management
- **Child Components:**
  - Overview tab
  - Team tab
  - Trips tab
  - Settings tab
  - InviteMemberModal
  - MobileTeamMemberCard

### 2.8 Other Screens

#### ArchivePage
- **Description:** Archived trips list
- **Child Components:**
  - ArchivedTripsSection
  - UnarchiveActions

#### ChravelRecsPage
- **Description:** AI-powered recommendations
- **Child Components:**
  - RecommendationCard
  - RecommendationFilters
  - SavedPlacesInline

#### JoinTrip
- **Description:** Accept trip invitation
- **Child Components:**
  - InvitePreview
  - AcceptButton
  - AuthPrompt (if unauthenticated)

---

## 3. COMPONENT HIERARCHY (Atomic → Composite → Page)

### 3.1 Atomic Components (UI Primitives)

#### Base Elements (`/components/ui/`)
- `button.tsx` - Button variants (default, outline, ghost, etc.)
- `input.tsx` - Text input with validation states
- `textarea.tsx` - Multi-line text input
- `checkbox.tsx` - Checkbox with label
- `switch.tsx` - Toggle switch
- `slider.tsx` - Range slider
- `select.tsx` - Dropdown select
- `radio-group.tsx` - Radio button group
- `badge.tsx` - Status/category badges
- `avatar.tsx` - User avatar with fallback
- `label.tsx` - Form labels
- `separator.tsx` - Visual divider

#### Feedback Elements
- `toast.tsx` - Toast notifications (Sonner)
- `alert.tsx` - Alert banners
- `alert-dialog.tsx` - Confirmation dialogs
- `progress.tsx` - Progress bars
- `skeleton.tsx` - Loading skeletons
- `spinner.tsx` - Loading spinners

#### Layout Elements
- `card.tsx` - Card container
- `tabs.tsx` - Tab navigation
- `accordion.tsx` - Collapsible sections
- `collapsible.tsx` - Toggle collapse
- `scroll-area.tsx` - Scrollable container
- `sheet.tsx` - Bottom sheet / side drawer
- `dialog.tsx` - Modal dialog
- `popover.tsx` - Popover menu
- `dropdown-menu.tsx` - Dropdown menu
- `context-menu.tsx` - Right-click menu
- `tooltip.tsx` - Hover tooltips

#### Interactive Elements
- `interactive-button.tsx` - Button with micro-animations
- `loading-skeleton.tsx` - Shimmer loading states
- `emoji-picker.tsx` - Emoji selection
- `date-picker.tsx` - Calendar date selection
- `time-picker.tsx` - Time selection
- `file-upload.tsx` - File input with drag-drop

### 3.2 Molecule Components (Composite Units)

#### Chat Molecules (`/components/chat/`)
- `MessageBubble` - Single message display
- `MessageInput` - Text input with send button
- `MessageReactions` - Emoji reaction bar
- `MessageAttachment` - Attachment preview
- `LinkPreviewCard` - OG metadata card
- `TypingIndicator` - "User is typing..."
- `ReadReceipts` - Seen indicators

#### Media Molecules (`/components/media/`)
- `MediaGridItem` - Single media thumbnail
- `MediaUploadButton` - Upload trigger
- `MediaPreview` - Full-screen preview
- `PhotoGallery` - Swipeable gallery
- `FileCard` - File attachment display

#### Payment Molecules (`/components/payments/`)
- `PaymentMethodCard` - Payment method display
- `AmountInput` - Currency amount input
- `SplitSelector` - Split type selector
- `ParticipantSelector` - Multi-select participants
- `BalanceCard` - Balance summary card

#### Poll Molecules (`/components/poll/`)
- `PollOption` - Single poll option
- `PollResults` - Results bar chart
- `VoteButton` - Vote action button

#### Task Molecules (`/components/todo/`)
- `TaskItem` - Single task row
- `TaskCheckbox` - Completion toggle
- `AssigneeAvatar` - Task assignee

#### Place Molecules (`/components/places/`)
- `PlaceCard` - Google Place preview
- `BasecampCard` - Trip basecamp display
- `SearchResult` - Autocomplete result
- `MapMarker` - Custom map pin

### 3.3 Organism Components (Feature Blocks)

#### Trip Organisms
- `TripCard` - Trip preview card (grid item)
- `TripHeader` - Trip detail header with edit
- `TripChat` - Full chat interface
- `TripCalendar` - Itinerary calendar view
- `TripPayments` - Payment management panel
- `TripMedia` - Media gallery tab

#### Pro Trip Organisms
- `TeamTab` - Team roster management
- `ChannelsList` - Pro channel navigation
- `RosterTable` - Team member table
- `ScheduleView` - Pro schedule timeline
- `AdminDashboard` - Admin controls panel

#### Event Organisms
- `EventSchedule` - Session schedule
- `SpeakerGrid` - Speaker card grid
- `SponsorSection` - Sponsor logos
- `RSVPPanel` - RSVP status management

#### AI Organisms
- `AIConciergeChat` - AI chat interface
- `RecommendationCard` - AI suggestion card
- `AIFeatureShowcase` - AI capability display

#### Settings Organisms
- `ConsumerSettings` - Consumer preference panels
- `EnterpriseSettings` - Enterprise config panels
- `BillingSection` - Subscription management
- `NotificationSection` - Notification preferences

### 3.4 Page-Level Components

#### Layout Components
- `MobileAppLayout` - Mobile app shell
- `MobileBottomNav` - Bottom tab bar
- `MobileErrorBoundary` - Error boundary wrapper
- `PullToRefreshIndicator` - Pull-to-refresh

#### Page Shells
- `Index` - Home page
- `TripDetail` - Trip detail page
- `ProTripDetail` - Pro trip page
- `EventDetail` - Event page
- `SettingsPage` - Settings page
- `ProfilePage` - Profile page
- `OrganizationDashboard` - Org dashboard
- `ArchivePage` - Archived trips

### 3.5 Reusable Patterns

#### Modal Patterns
- Full-screen modal (AuthModal)
- Bottom sheet (MobileTripInfoDrawer)
- Side drawer (SettingsMenu)
- Confirmation dialog (AlertDialog)
- Action sheet (MobileActionSheet)

#### List Patterns
- Virtualized list (useVirtualScroll)
- Pull-to-refresh list
- Infinite scroll list
- Grouped list (by date/category)

#### Form Patterns
- Validated input (ValidatedInput)
- Form with Zod schema
- Multi-step form
- Inline edit form

---

## 4. FULL DATA ARCHITECTURE

### 4.1 Core Models

#### User Model
```typescript
interface User {
  id: string;
  email?: string;
  phone?: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  isPro: boolean;
  showEmail: boolean;
  showPhone: boolean;
  proRole?: 'admin' | 'staff' | 'talent' | 'player' | 'crew' | 'security' | 'medical' | 'producer' | 'speakers' | 'guests' | 'coordinators' | 'logistics' | 'press';
  organizationId?: string;
  permissions: string[];
  notificationSettings: {
    messages: boolean;
    broadcasts: boolean;
    tripUpdates: boolean;
    email: boolean;
    push: boolean;
  };
}
```

#### Trip Model
```typescript
interface Trip {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  destination?: string;
  cover_image_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  trip_type: 'consumer' | 'pro' | 'event';
  basecamp_name?: string;
  basecamp_address?: string;
  enabled_features?: string[];
}
```

#### Message Model
```typescript
interface Message {
  id: string;
  content: string;
  sender_id: string;
  trip_id: string;
  created_at: string;
  updated_at?: string;
  author_name?: string;
  reply_to_id?: string;
  thread_id?: string;
  is_edited?: boolean;
  edited_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  attachments?: Array<{
    type: 'image' | 'video' | 'file';
    url: string;
    name?: string;
  }>;
  media_type?: string;
  media_url?: string;
  link_preview?: any;
  privacy_mode?: string;
  message_type?: 'text' | 'broadcast' | 'payment' | 'system';
}
```

#### Payment Models
```typescript
interface PaymentMethod {
  id: string;
  type: 'venmo' | 'zelle' | 'cashapp' | 'applepay' | 'paypal' | 'applecash' | 'cash' | 'other';
  identifier: string;
  displayName?: string;
  isPreferred?: boolean;
  isVisible?: boolean;
}

interface PaymentSplit {
  id: string;
  tripId: string;
  createdBy: string;
  amount: number;
  currency: string;
  description: string;
  splitType: 'equal' | 'custom' | 'percentage';
  participants: PaymentParticipant[];
  settled: boolean;
  receiptUrl?: string;
  timestamp: string;
}
```

#### Task Model
```typescript
interface TripTask {
  id: string;
  trip_id: string;
  creator_id: string;
  title: string;
  description?: string;
  due_at?: string;
  is_poll: boolean;
  created_at: string;
  updated_at: string;
  task_status?: TaskStatus[];
}

interface TaskStatus {
  task_id: string;
  user_id: string;
  completed: boolean;
  completed_at?: string;
}
```

#### Channel Model (Pro)
```typescript
interface TripChannel {
  id: string;
  trip_id: string;
  name: string;
  slug: string;
  description?: string;
  channel_type: 'role' | 'custom';
  role_filter?: {
    role?: string;
    department?: string;
  };
  created_by: string;
  created_at: string;
  is_archived: boolean;
}
```

#### Event Model
```typescript
interface EventData {
  id: string;
  title: string;
  location: string;
  dateRange: string;
  category: string;
  description: string;
  capacity: number;
  registrationStatus: 'open' | 'closed' | 'waitlist';
  tracks: Track[];
  speakers: Speaker[];
  sessions: Session[];
  sponsors: Sponsor[];
  exhibitors: Exhibitor[];
  participants: EventAttendee[];
  budget: {
    total: number;
    spent: number;
    sponsorRevenue?: number;
  };
}
```

### 4.2 State Stores

#### Demo Mode Store (Zustand)
```typescript
interface DemoModeState {
  isDemoMode: boolean;
  demoView: 'off' | 'marketing' | 'mock';
  isLoading: boolean;
  setDemoMode: (enabled: boolean) => void;
  setDemoView: (view: 'off' | 'marketing' | 'mock') => void;
  setLoading: (loading: boolean) => void;
}
```

#### Auth Context (React Context)
```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithPhone: (phone: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithApple: () => Promise<{ error?: string }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: any }>;
  switchRole: (role: string) => void;
}
```

#### Trip Variant Context (React Context)
```typescript
interface TripVariantContextType {
  variant: 'consumer' | 'pro' | 'events';
}
```

### 4.3 DTOs (Data Transfer Objects)

#### Create Trip Request
```typescript
interface CreateTripData {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  destination?: string;
  cover_image_url?: string;
  trip_type?: 'consumer' | 'pro' | 'event';
  enabled_features?: string[];
}
```

#### Create Channel Request
```typescript
interface CreateChannelRequest {
  trip_id: string;
  name: string;
  description?: string;
  channel_type: 'role' | 'custom';
  role_filter?: { role?: string; department?: string; };
  member_user_ids?: string[];
}
```

#### Payment Creation Request
```typescript
interface PaymentRequest {
  tripId: string;
  amount: number;
  currency: string;
  description: string;
  participants: string[];
  splitType: 'equal' | 'custom' | 'percentage';
  customAmounts?: Record<string, number>;
  preferredMethod?: PaymentMethod;
  receiptUrl?: string;
}
```

### 4.4 Derived/Computed States

#### Trip Stats
```typescript
interface TripStats {
  total: number;
  active: number;
  upcoming: number;
  past: number;
  archived: number;
}
```

#### Balance Summary
```typescript
interface BalanceSummary {
  totalOwed: number;
  totalOwedToYou: number;
  netBalance: number;
  baseCurrency: string;
  balances: PersonalBalance[];
}
```

#### Channel Stats
```typescript
interface ChannelStats {
  channel_id: string;
  member_count: number;
  message_count: number;
  last_message_at?: string;
  unread_count?: number;
}
```

---

## 5. DATABASE SCHEMA

### 5.1 Core Tables

#### `profiles`
```sql
- id: UUID PRIMARY KEY
- user_id: UUID REFERENCES auth.users(id)
- display_name: TEXT
- first_name: TEXT
- last_name: TEXT
- avatar_url: TEXT
- bio: TEXT
- show_email: BOOLEAN DEFAULT false
- show_phone: BOOLEAN DEFAULT false
- subscription_status: TEXT
- subscription_product_id: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `trips`
```sql
- id: UUID PRIMARY KEY
- name: TEXT NOT NULL
- description: TEXT
- destination: TEXT
- start_date: DATE
- end_date: DATE
- cover_image_url: TEXT
- created_by: UUID REFERENCES auth.users(id)
- is_archived: BOOLEAN DEFAULT false
- trip_type: TEXT DEFAULT 'consumer' CHECK (trip_type IN ('consumer', 'pro', 'event'))
- basecamp_name: TEXT
- basecamp_address: TEXT
- enabled_features: TEXT[]
- privacy_mode: TEXT DEFAULT 'standard'
- ai_access_enabled: BOOLEAN DEFAULT true
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `trip_members`
```sql
- id: UUID PRIMARY KEY
- trip_id: UUID REFERENCES trips(id) ON DELETE CASCADE
- user_id: UUID REFERENCES auth.users(id)
- role: TEXT DEFAULT 'member'
- created_at: TIMESTAMPTZ
```

#### `trip_chat_messages`
```sql
- id: UUID PRIMARY KEY
- trip_id: UUID REFERENCES trips(id) ON DELETE CASCADE
- sender_id: UUID REFERENCES auth.users(id)
- content: TEXT NOT NULL
- author_name: TEXT
- message_type: TEXT DEFAULT 'text'
- reply_to_id: UUID
- thread_id: UUID
- is_edited: BOOLEAN DEFAULT false
- edited_at: TIMESTAMPTZ
- is_deleted: BOOLEAN DEFAULT false
- deleted_at: TIMESTAMPTZ
- attachments: JSONB
- media_type: TEXT
- media_url: TEXT
- link_preview: JSONB
- privacy_mode: TEXT DEFAULT 'standard'
- privacy_encrypted: BOOLEAN DEFAULT false
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 5.2 Payment Tables

#### `user_payment_methods`
```sql
- id: UUID PRIMARY KEY
- user_id: UUID REFERENCES auth.users(id)
- method_type: TEXT NOT NULL
- identifier: TEXT NOT NULL
- display_name: TEXT
- is_preferred: BOOLEAN DEFAULT false
- is_visible: BOOLEAN DEFAULT true
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `trip_payment_messages`
```sql
- id: UUID PRIMARY KEY
- trip_id: UUID REFERENCES trips(id)
- message_id: UUID
- amount: DECIMAL(10,2) NOT NULL
- currency: TEXT DEFAULT 'USD'
- description: TEXT NOT NULL
- split_count: INTEGER NOT NULL
- split_participants: TEXT[]
- payment_methods: TEXT[]
- created_by: UUID REFERENCES auth.users(id)
- is_settled: BOOLEAN DEFAULT false
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- version: INTEGER DEFAULT 1
```

#### `payment_splits`
```sql
- id: UUID PRIMARY KEY
- payment_message_id: UUID REFERENCES trip_payment_messages(id)
- debtor_user_id: UUID REFERENCES auth.users(id)
- amount_owed: DECIMAL(10,2) NOT NULL
- is_settled: BOOLEAN DEFAULT false
- settled_at: TIMESTAMPTZ
- settlement_method: TEXT
- created_at: TIMESTAMPTZ
```

### 5.3 Task Tables

#### `trip_tasks`
```sql
- id: UUID PRIMARY KEY
- trip_id: UUID REFERENCES trips(id) ON DELETE CASCADE
- creator_id: UUID REFERENCES auth.users(id)
- title: TEXT NOT NULL
- description: TEXT
- due_at: TIMESTAMPTZ
- is_poll: BOOLEAN DEFAULT false
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `task_assignments`
```sql
- id: UUID PRIMARY KEY
- task_id: UUID REFERENCES trip_tasks(id) ON DELETE CASCADE
- user_id: UUID REFERENCES auth.users(id)
- completed: BOOLEAN DEFAULT false
- completed_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

### 5.4 Pro/Channel Tables

#### `trip_channels`
```sql
- id: UUID PRIMARY KEY
- trip_id: UUID REFERENCES trips(id) ON DELETE CASCADE
- name: TEXT NOT NULL
- slug: TEXT NOT NULL
- description: TEXT
- channel_type: TEXT CHECK (channel_type IN ('role', 'custom'))
- role_filter: JSONB
- created_by: UUID REFERENCES auth.users(id)
- is_archived: BOOLEAN DEFAULT false
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `channel_members`
```sql
- id: UUID PRIMARY KEY
- channel_id: UUID REFERENCES trip_channels(id)
- user_id: UUID REFERENCES auth.users(id)
- role: TEXT
- joined_at: TIMESTAMPTZ
```

#### `channel_messages`
```sql
- id: UUID PRIMARY KEY
- channel_id: UUID REFERENCES trip_channels(id)
- trip_id: UUID REFERENCES trips(id)
- user_id: UUID REFERENCES auth.users(id)
- content: TEXT NOT NULL
- author_name: TEXT
- edited_at: TIMESTAMPTZ
- deleted_at: TIMESTAMPTZ
- reply_to_id: UUID
- attachments: JSONB
- media_type: TEXT
- media_url: TEXT
- link_preview: JSONB
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 5.5 Organization Tables

#### `organizations`
```sql
- id: UUID PRIMARY KEY
- name: TEXT NOT NULL UNIQUE
- display_name: TEXT NOT NULL
- billing_email: TEXT NOT NULL
- subscription_tier: TEXT DEFAULT 'starter'
- subscription_status: TEXT DEFAULT 'active'
- seat_limit: INTEGER DEFAULT 25
- seats_used: INTEGER DEFAULT 0
- stripe_customer_id: TEXT
- stripe_subscription_id: TEXT
- trial_ends_at: TIMESTAMPTZ
- subscription_ends_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `organization_members`
```sql
- id: UUID PRIMARY KEY
- organization_id: UUID REFERENCES organizations(id)
- user_id: UUID REFERENCES auth.users(id)
- role: TEXT CHECK (role IN ('owner', 'admin', 'member'))
- seat_id: TEXT
- status: TEXT DEFAULT 'active'
- invited_by: UUID
- joined_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

### 5.6 Notification Tables

#### `notification_preferences`
```sql
- id: UUID PRIMARY KEY
- user_id: UUID REFERENCES auth.users(id) UNIQUE
- push_enabled: BOOLEAN DEFAULT true
- email_enabled: BOOLEAN DEFAULT true
- sms_enabled: BOOLEAN DEFAULT false
- chat_messages: BOOLEAN DEFAULT false
- mentions_only: BOOLEAN DEFAULT true
- broadcasts: BOOLEAN DEFAULT true
- tasks: BOOLEAN DEFAULT true
- payments: BOOLEAN DEFAULT true
- calendar_reminders: BOOLEAN DEFAULT true
- trip_invites: BOOLEAN DEFAULT true
- quiet_hours_enabled: BOOLEAN DEFAULT false
- quiet_start: TIME DEFAULT '22:00'
- quiet_end: TIME DEFAULT '08:00'
- timezone: TEXT DEFAULT 'America/Los_Angeles'
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `push_tokens`
```sql
- id: UUID PRIMARY KEY
- user_id: UUID REFERENCES auth.users(id)
- token: TEXT NOT NULL
- platform: TEXT CHECK (platform IN ('ios', 'android', 'web'))
- device_info: JSONB
- active: BOOLEAN DEFAULT true
- last_used_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

#### `notification_history`
```sql
- id: UUID PRIMARY KEY
- user_id: UUID REFERENCES auth.users(id)
- trip_id: UUID REFERENCES trips(id)
- notification_type: TEXT CHECK (notification_type IN ('broadcast', 'mention', 'chat', 'task', 'payment', 'calendar', 'invite', 'join_request', 'system'))
- title: TEXT NOT NULL
- body: TEXT NOT NULL
- data: JSONB
- read: BOOLEAN DEFAULT false
- read_at: TIMESTAMPTZ
- clicked: BOOLEAN DEFAULT false
- clicked_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- expires_at: TIMESTAMPTZ
```

### 5.7 Media Tables

#### `trip_media_index`
```sql
- id: UUID PRIMARY KEY
- trip_id: UUID REFERENCES trips(id)
- message_id: UUID
- media_url: TEXT NOT NULL
- media_type: TEXT CHECK (media_type IN ('image', 'video', 'audio'))
- filename: TEXT
- metadata: JSONB
- source: TEXT DEFAULT 'upload'
- uploaded_by: UUID REFERENCES auth.users(id)
- created_at: TIMESTAMPTZ
```

#### `trip_files`
```sql
- id: UUID PRIMARY KEY
- trip_id: UUID REFERENCES trips(id)
- message_id: UUID
- file_url: TEXT NOT NULL
- filename: TEXT NOT NULL
- file_type: TEXT
- file_size: BIGINT
- metadata: JSONB
- uploaded_by: UUID REFERENCES auth.users(id)
- created_at: TIMESTAMPTZ
```

#### `trip_link_index`
```sql
- id: UUID PRIMARY KEY
- trip_id: UUID REFERENCES trips(id)
- message_id: UUID
- url: TEXT NOT NULL
- title: TEXT
- description: TEXT
- domain: TEXT
- image_url: TEXT
- source: TEXT DEFAULT 'manual'
- added_by: UUID REFERENCES auth.users(id)
- created_at: TIMESTAMPTZ
```

### 5.8 Calendar Tables

#### `calendar_connections`
```sql
- id: UUID PRIMARY KEY
- user_id: UUID REFERENCES auth.users(id)
- provider: TEXT CHECK (provider IN ('google', 'outlook', 'apple'))
- access_token: TEXT NOT NULL
- refresh_token: TEXT
- calendar_id: TEXT NOT NULL
- sync_enabled: BOOLEAN DEFAULT true
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `trip_itinerary_items`
```sql
- id: UUID PRIMARY KEY
- trip_id: UUID REFERENCES trips(id)
- title: TEXT NOT NULL
- description: TEXT
- location: TEXT
- start_time: TIMESTAMPTZ NOT NULL
- end_time: TIMESTAMPTZ
- event_type: TEXT
- created_by: UUID REFERENCES auth.users(id)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 5.9 Indexes

```sql
-- Performance indexes
CREATE INDEX idx_trips_created_by ON trips(created_by);
CREATE INDEX idx_trips_archived ON trips(is_archived);
CREATE INDEX idx_trip_members_trip ON trip_members(trip_id);
CREATE INDEX idx_trip_members_user ON trip_members(user_id);
CREATE INDEX idx_messages_trip ON trip_chat_messages(trip_id);
CREATE INDEX idx_messages_sender ON trip_chat_messages(sender_id);
CREATE INDEX idx_messages_created ON trip_chat_messages(created_at DESC);
CREATE INDEX idx_channels_trip ON trip_channels(trip_id);
CREATE INDEX idx_notification_history_user_unread ON notification_history(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_push_tokens_user_active ON push_tokens(user_id, active) WHERE active = TRUE;
```

### 5.10 Row Level Security (RLS)

```sql
-- Trips: Users can view their own trips or trips they're members of
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips" ON trips
  FOR SELECT USING (
    created_by = auth.uid() OR
    id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create trips" ON trips
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own trips" ON trips
  FOR UPDATE USING (created_by = auth.uid());

-- Messages: Trip members can view/send messages
ALTER TABLE trip_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can view messages" ON trip_chat_messages
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips WHERE created_by = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can send messages" ON trip_chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    trip_id IN (
      SELECT id FROM trips WHERE created_by = auth.uid()
      UNION
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );
```

---

## 6. COMPLETE NAVIGATION MAP

### 6.1 Root Navigation Structure

```
App Entry (@main)
├── AuthCheck
│   ├── Not Authenticated
│   │   ├── FullPageLanding (marketing)
│   │   ├── AuthModal (sign in/up)
│   │   └── Demo Mode (if enabled)
│   │       ├── Home (mock data)
│   │       ├── TripDetail (mock)
│   │       ├── ProTripDetail (mock)
│   │       └── EventDetail (mock)
│   └── Authenticated
│       ├── Home (Index)
│       ├── TripDetail/:tripId
│       ├── ProTripDetail/:tripId (tour/pro/:tripId)
│       ├── EventDetail/:eventId (event/:eventId)
│       ├── ProfilePage
│       ├── SettingsPage
│       ├── ArchivePage
│       ├── OrganizationsHub
│       ├── OrganizationDashboard/:orgId
│       ├── JoinTrip/:inviteCode
│       └── AcceptOrganizationInvite
```

### 6.2 Tab Navigation (Mobile)

```
MobileBottomNav
├── Home Tab
│   └── Index (trip list)
├── (Trip Detail Context)
│   ├── Chat Tab
│   │   └── MobileTripChat
│   ├── Media Tab
│   │   └── MobileUnifiedMediaHub
│   │       ├── Photos Sub-tab
│   │       ├── Videos Sub-tab
│   │       ├── Files Sub-tab
│   │       └── Links Sub-tab
│   ├── Pay Tab
│   │   └── MobileTripPayments
│   ├── Calendar Tab
│   │   └── MobileGroupCalendar
│   └── AI Tab
│       └── AIConciergeChat
└── Settings Tab
    └── SettingsMenu
```

### 6.3 Pro Trip Tab Navigation

```
ProTripDetail
├── Team Tab
│   └── TeamTab
│       ├── RolesView
│       └── TeamMemberCards
├── Channels Tab
│   └── ChannelsList
│       └── ChannelMessages (per channel)
├── Admin Tab (if admin)
│   └── ProAdminDashboard
│       ├── ComplianceSection
│       ├── SettlementSection
│       └── BroadcastSection
├── Chat Tab
│   └── TripChat (main channel)
├── Media Tab
│   └── MediaAggregatedPhotos
├── Pay Tab
│   └── TripPayments
└── AI Tab
    └── AIConciergeChat
```

### 6.4 Deep Link Routes

```
chravel://
├── /trip/:tripId - Open consumer trip
├── /tour/pro/:tripId - Open pro trip
├── /event/:eventId - Open event
├── /join/:inviteCode - Accept trip invite
├── /organization/:orgId - Open organization
├── /settings - Open settings
├── /profile - Open profile
├── /archive - Open archived trips
└── /search?q=:query - Open search with query
```

### 6.5 Conditional Navigation Rules

| Condition | Navigation Behavior |
|-----------|---------------------|
| `!user && !demoMode` | → FullPageLanding |
| `!user && demoMode === 'mock'` | → Home with mock data |
| `user && trip.trip_type === 'consumer'` | → TripDetail |
| `user && trip.trip_type === 'pro'` | → ProTripDetail |
| `user && trip.trip_type === 'event'` | → EventDetail |
| `isMobile` | → Mobile* component variants |
| `!isMobile` | → Desktop* component variants |
| `user.proRole === 'admin'` | → Show admin tabs |

---

## 7. SYSTEM BEHAVIORS + BUSINESS LOGIC

### 7.1 Authentication Flow

#### Sign In with Email
```
Input: email, password
→ Supabase.auth.signInWithPassword()
→ If error:
   - "Invalid login credentials" → Show specific error
   - "Email not confirmed" → Prompt to check email
→ If success:
   → Fetch user profile from profiles table
   → Fetch user roles from user_roles table
   → Fetch organization membership from organization_members
   → Fetch notification preferences
   → Transform to User object
   → Update AuthContext
Output: User | Error
```

#### Sign Up Flow
```
Input: email, password, firstName, lastName
→ Supabase.auth.signUp() with metadata
→ If error:
   - "already registered" → Suggest sign in
   - "password" → Password requirements error
→ If success but no session:
   → "Check email to confirm account"
→ If success with session:
   → Profile created via database trigger
   → Navigate to Home
Output: User | "Confirm email" | Error
```

### 7.2 Trip Creation Business Logic

```
Input: CreateTripData
Validation:
  - name: Required, non-empty
  - start_date: Must be valid date or null
  - end_date: Must be >= start_date or null
  - trip_type: Must be 'consumer' | 'pro' | 'event'

Business Rules:
  - Free users: Max 3 active (non-archived) trips
  - Explorer users: Unlimited trips
  - Pro trip creation: Requires organization membership
  - Event creation: Requires Chravel+ subscription

Process:
→ Validate user authentication
→ Check active trip count for tier
→ If TRIP_LIMIT_REACHED → Show upgrade modal
→ Call create-trip edge function
→ Edge function creates trip + trip_member (as creator)
→ Optionally link to organization (pro trips)
→ Return created trip

Output: Trip | Error
```

### 7.3 Payment Split Logic

```
Input: PaymentRequest
Validation:
  - amount > 0
  - participants.length > 0
  - splitType valid

Equal Split:
  splitAmount = amount / participants.length

Custom Split:
  - Sum of customAmounts must equal amount
  - Each participant must have amount specified

Percentage Split:
  - Sum of percentages must equal 100%
  - splitAmount = amount * (percentage / 100)

Process:
→ Create payment message
→ Create payment_splits for each participant
→ Record split pattern for ML
→ Notify participants
→ Update balances

Balance Calculation:
  - Payer gets +amount credit
  - Each participant gets -splitAmount debit
  - Net balance = credits - debits

Settlement Suggestions:
  - Find optimal payment graph
  - Minimize number of transactions
  - Consider preferred payment methods
```

### 7.4 Real-time Chat Logic

```
Subscription:
→ Subscribe to postgres_changes on trip_chat_messages
→ Filter by trip_id
→ On INSERT: Add to message list
→ On UPDATE: Update existing message

Send Message:
→ Validate content not empty
→ Check for @mentions
→ Extract links for preview
→ Insert to database
→ If attachments: Upload to storage first
→ Trigger notification for mentions

Edit Message:
→ Only sender can edit
→ Set is_edited = true
→ Set edited_at = now()
→ Update content

Delete Message:
→ Only sender can delete
→ Soft delete: is_deleted = true
→ Replace content with "[Message deleted]"
```

### 7.5 AI Concierge Logic

```
Query Processing:
Input: User question + trip context

Context Aggregation:
→ Fetch trip data (participants, dates, location)
→ Fetch recent messages (last 100)
→ Fetch itinerary items
→ Fetch saved places
→ Fetch user preferences

Rate Limiting:
  - Free: 5 queries per trip
  - Explorer: 10 queries per trip
  - Frequent Chraveler: Unlimited

If rate limited:
  → Show upgrade prompt
  → Return cached suggestions if available

RAG Processing:
→ Generate embeddings for query
→ Search vector store for relevant context
→ Build prompt with context
→ Call Gemini/OpenAI for response
→ Ground with Google Places if location-relevant

Output:
  - Text response
  - Sources cited
  - Confidence score
  - Suggested actions (optional)
```

### 7.6 Notification Logic

```
Trigger Events:
  - Broadcast created → Notify all trip members
  - @mention in chat → Notify mentioned user
  - Task assigned → Notify assignee
  - Payment split → Notify participants
  - Trip invite → Notify invitee
  - Calendar reminder → Notify 15 min before

Notification Processing:
→ Check user notification_preferences
→ If notification type disabled → Skip
→ If quiet hours active → Queue for later
→ Insert into notification_history
→ If push_enabled → Send push notification
→ If email_enabled → Queue email

Push Notification Flow:
→ Get push_tokens for user (active only)
→ For each token:
   - iOS: APNs
   - Android: FCM
   - Web: Web Push API
→ Handle failures (deactivate stale tokens)
```

### 7.7 Media Upload Logic

```
Input: File + tripId + source

Validation:
  - File size < 50MB (images), 500MB (videos)
  - Supported types: jpg, png, gif, webp, mp4, mov
  - User has storage quota available

Storage Quota Check:
  - Free: 500MB limit
  - Paid: 50GB limit
  - Calculate current usage
  - If over limit → Show upgrade modal

Upload Process:
→ Generate unique filename
→ Compress if image (optional)
→ Upload to Supabase storage
→ Extract metadata (EXIF, dimensions)
→ Insert into trip_media_index
→ If from chat: Update message with media_url
→ Queue for AI tagging (async)

AI Tagging (Background):
→ Analyze image content
→ Generate tags
→ Detect faces
→ Extract location if available
→ Update metadata
```

---

## 8. API CALLS + DATA FLOW

### 8.1 Supabase Database Operations

#### trips Table Operations

| Operation | Method | Path | Payload | Response | Called From |
|-----------|--------|------|---------|----------|-------------|
| Get user trips | SELECT | `trips.select('*')` | `.eq('created_by', userId)` | Trip[] | useTrips hook |
| Get trip by ID | SELECT | `trips.select('*')` | `.eq('id', tripId).single()` | Trip | getTripById |
| Create trip | RPC | `functions.invoke('create-trip')` | CreateTripData | Trip | tripService.createTrip |
| Update trip | UPDATE | `trips.update(updates)` | `.eq('id', tripId)` | void | tripService.updateTrip |
| Archive trip | UPDATE | `trips.update({is_archived: true})` | `.eq('id', tripId)` | void | tripService.archiveTrip |

#### trip_chat_messages Table Operations

| Operation | Method | Payload | Response | Called From |
|-----------|--------|---------|----------|-------------|
| Get messages | SELECT | `.eq('trip_id', tripId).order('created_at')` | Message[] | useTripChat |
| Send message | INSERT | ChatMessageInsert | Message | sendChatMessage |
| Edit message | UPDATE | `{content, is_edited, edited_at}` | void | editChatMessage |
| Delete message | UPDATE | `{is_deleted, deleted_at, content}` | void | deleteChatMessage |
| Subscribe | REALTIME | `postgres_changes.INSERT` | Message | subscribeToChatMessages |

#### Payment Operations

| Operation | Method | Payload | Response | Called From |
|-----------|--------|---------|----------|-------------|
| Get payments | SELECT | `.eq('trip_id', tripId)` | PaymentMessage[] | getTripPaymentMessages |
| Create payment | RPC | `create_payment_with_splits_v2` | paymentId | createPaymentMessage |
| Settle payment | UPDATE | `{is_settled, settled_at, settlement_method}` | void | settlePayment |
| Get methods | SELECT | `.eq('user_id', userId)` | PaymentMethod[] | getUserPaymentMethods |

### 8.2 Edge Function Calls

#### create-trip
```typescript
Request:
  POST /functions/v1/create-trip
  Body: {
    name: string;
    description?: string;
    destination?: string;
    start_date?: string;
    end_date?: string;
    trip_type: 'consumer' | 'pro' | 'event';
    enabled_features?: string[];
  }

Response:
  { success: true, trip: Trip }
  | { success: false, error: string }

State Transitions:
  - Creates trip record
  - Creates trip_member (creator as admin)
  - For pro trips: Links to organization
  - Triggers notification to org admins (pro)
```

#### gemini-chat (AI Concierge)
```typescript
Request:
  POST /functions/v1/gemini-chat
  Body: {
    tripId: string;
    query: string;
    context: TripContext;
  }

Response:
  {
    response: string;
    sources: AiSource[];
    confidence: number;
  }

Error States:
  - RATE_LIMITED: User exceeded query quota
  - CONTEXT_ERROR: Failed to fetch trip context
  - AI_ERROR: Model inference failed
```

#### push-notifications
```typescript
Request:
  POST /functions/v1/push-notifications
  Body: {
    user_ids: string[];
    title: string;
    body: string;
    data: { trip_id?: string; type: string; }
  }

Response:
  { sent: number; failed: number; }

Error States:
  - Invalid token: Token deactivated
  - Rate limited: Expo push limit
```

### 8.3 Google Maps API Calls

#### Places Autocomplete
```typescript
Request:
  google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: string;
    sessionToken: string;
    locationBias: { circle: { center, radius } };
  })

Response:
  AutocompleteSuggestion[]

Called From:
  - useMapSearch hook
  - AddPlaceModal
  - SearchBar
```

#### Place Details
```typescript
Request:
  google.maps.places.Place.fetchFields({
    fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'photos']
  })

Response:
  PlaceData

Called From:
  - PlaceInfoOverlay
  - BasecampCard
```

### 8.4 State Transitions Diagram

```
[Unauthenticated]
    │
    ├── signIn() ──────────────► [Authenticated]
    ├── signUp() ──────────────► [Pending Email Confirm]
    │                                    │
    │                                    ▼
    │                            [Confirmed] ──► [Authenticated]
    │
    └── enableDemoMode() ──────► [Demo Mode]

[Authenticated]
    │
    ├── createTrip() ─────────► [Trip Created] ──► Navigate to TripDetail
    ├── joinTrip(code) ────────► [Trip Joined] ──► Navigate to TripDetail
    ├── archiveTrip() ─────────► [Trip Archived] ──► Removed from list
    │
    └── signOut() ─────────────► [Unauthenticated]

[TripDetail]
    │
    ├── sendMessage() ─────────► [Message Sent] ──► Update chat list
    ├── createPayment() ───────► [Payment Created] ──► Notify participants
    ├── createTask() ──────────► [Task Created] ──► Notify assignees
    │
    └── askAI() ───────────────► [AI Query] ──► Display response
```

---

## 9. AI INTEGRATION POINTS

### 9.1 AI Concierge Chat

#### Prompt Structure
```
System:
  "You are Chravel AI, a helpful travel assistant. You have context about this trip including messages, itinerary, participants, and saved places. Answer questions about the trip, make suggestions, and help with planning."

Context Injection:
  - Trip: {title, location, dateRange, participants}
  - Recent Messages: [last 50 messages]
  - Itinerary: [upcoming events]
  - Saved Places: [bookmarked locations]
  - User Preferences: {dietary, vibe, accessibility}

Query: {user question}

Output Format:
  - Natural language response
  - Cite sources when referencing trip data
  - Include actionable suggestions when appropriate
```

#### Retrieval Logic
```
1. Generate embedding for user query
2. Search trip_embeddings for similar content
3. Rank by relevance score
4. Include top 10 chunks in context
5. Filter by recency (prefer recent)
```

#### Grounding
```
If query involves locations:
  → Call Google Places API
  → Include place details in response
  → Cite Google Maps URL

If query involves weather:
  → Fetch weather data
  → Include forecast in response
```

### 9.2 Receipt OCR

#### Input
- Image file (jpg, png)
- User ID for rate limiting

#### Processing
```
1. Upload image to storage
2. Call document-processor edge function
3. Extract:
   - Vendor name
   - Date
   - Line items with prices
   - Total amount
   - Tax
   - Tip (if restaurant)
4. Return structured data
```

#### Output
```typescript
{
  vendor: string;
  date: string;
  items: Array<{ name: string; price: number }>;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  confidence: number;
}
```

### 9.3 Smart Todo Generation

#### Trigger
- New messages with action items
- Calendar events approaching
- Admin request

#### Processing
```
1. Analyze message content
2. Extract potential tasks:
   - "Let's book..." → Booking task
   - "Don't forget..." → Reminder task
   - "We need to..." → Action task
3. Assign confidence score
4. Suggest assignee based on context
```

### 9.4 Calendar Event Detection

#### Input
- Chat message content
- Trip context

#### Processing
```
1. Parse message for date/time patterns
2. Extract event details:
   - Title
   - Location
   - Start time
   - End time
3. Validate against itinerary conflicts
4. Suggest adding to calendar
```

### 9.5 AI Feature Dependencies

| Feature | Model | API | Rate Limit |
|---------|-------|-----|------------|
| Concierge Chat | Gemini Pro | Google AI | 60 req/min |
| Receipt OCR | Vision | Google Cloud | 1000/day |
| Embeddings | text-embedding-3-small | OpenAI | 3000/min |
| Smart Todos | GPT-4 | OpenAI | 500/day |
| Photo Tagging | Vision | Google Cloud | 5000/day |

---

## 10. DEPENDENCIES + ENVIRONMENT

### 10.1 Core Dependencies

#### Frontend Framework
- react: ^18.3.1
- react-dom: ^18.3.1
- react-router-dom: ^6.26.2
- typescript: ^5.9.3

#### State Management
- @tanstack/react-query: ^5.56.2
- zustand: ^5.0.6

#### Backend
- @supabase/supabase-js: ^2.53.0

#### UI Components
- @radix-ui/* (Accordion, Dialog, Dropdown, etc.)
- tailwindcss: ^3.4.11
- lucide-react: ^0.462.0
- framer-motion: ^10.18.0
- class-variance-authority: ^0.7.1
- clsx: ^2.1.1
- tailwind-merge: ^2.5.2

#### Maps
- @googlemaps/js-api-loader: ^1.16.10
- @types/google.maps: ^3.58.1
- leaflet: ^1.9.4 (fallback)

#### Native (Capacitor)
- @capacitor/core: ^7.4.2
- @capacitor/ios: ^7.4.2
- @capacitor/camera: ^7.0.1
- @capacitor/geolocation: ^7.1.4
- @capacitor/haptics: ^7.0.2
- @capacitor/push-notifications: ^7.0.1
- @capacitor/filesystem: ^7.1.2
- @capacitor/share: ^7.0.1
- @capacitor/preferences: ^7.0.2

#### Utilities
- date-fns: ^3.6.0
- browser-image-compression: ^2.0.2
- html2canvas: ^1.4.1
- jspdf: ^3.0.3
- xlsx: ^0.18.5

### 10.2 Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=AIza...

# Stripe
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Feature Flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_DEMO_MODE=true
```

### 10.3 Required APIs

| API | Purpose | Required Keys |
|-----|---------|---------------|
| Supabase | Database, Auth, Storage, Edge Functions | URL, Anon Key |
| Google Maps Platform | Maps, Places, Geocoding | API Key |
| Google Cloud Vision | Receipt OCR, Image Analysis | Service Account |
| Google Gemini | AI Concierge | API Key |
| OpenAI | Embeddings, Backup AI | API Key |
| Stripe | Payments, Subscriptions | Public Key, Secret Key |
| Apple Push Notification | iOS Push | APNs Certificate |
| Firebase Cloud Messaging | Android Push | Server Key |

### 10.4 iOS Entitlements Required

```xml
<key>aps-environment</key>
<string>production</string>

<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:chravel.com</string>
  <string>webcredentials:chravel.com</string>
</array>

<key>com.apple.developer.authentication-services.autofill-credential-provider</key>
<true/>

<key>com.apple.developer.healthkit</key>
<false/>

<key>com.apple.developer.in-app-payments</key>
<array>
  <string>merchant.com.chravel</string>
</array>
```

### 10.5 Build Assumptions

- Node.js 18+
- npm/yarn for package management
- Vite 5+ for bundling
- Xcode 16+ for iOS builds
- iOS Deployment Target: 15.0+
- Swift 5.10+

---

## 11. EDGE CASES

### 11.1 Failure Modes

#### Network Failures
- **Offline Send Message:** Queue message locally, sync when online
- **Offline Create Trip:** Block with "No internet connection"
- **Offline View Trip:** Show cached data with stale indicator
- **API Timeout:** Retry with exponential backoff (3 attempts)

#### Authentication Failures
- **Session Expired:** Refresh token automatically
- **Token Refresh Failed:** Force re-login
- **OAuth Popup Blocked:** Show manual link option
- **Email Not Confirmed:** Show resend confirmation option

#### Data Sync Failures
- **Optimistic Update Rollback:** Revert UI state, show error toast
- **Realtime Disconnect:** Auto-reconnect with backoff
- **Stale Data Conflict:** Server wins, merge changes if possible

### 11.2 User Error Conditions

- **Empty Trip Name:** Prevent submit, show validation error
- **Invalid Date Range:** End date before start, show error
- **Duplicate Trip Member:** Silently ignore, no error
- **Message Too Long:** Truncate at 10,000 characters
- **Invalid Invite Code:** Show "Invite not found or expired"
- **No Payment Method:** Prompt to add before creating split

### 11.3 Race Conditions

- **Double Message Send:** Dedupe by client-generated ID
- **Concurrent Payment Settlement:** Optimistic locking with version check
- **Parallel Trip Updates:** Last write wins with conflict detection
- **Multiple Tab Realtime:** Dedupe via message ID

### 11.4 Latency/Timeouts

| Operation | Timeout | Fallback |
|-----------|---------|----------|
| Auth Check | 10s | Force loading complete, show login |
| Profile Fetch | 2s | Use cached/default profile |
| Trip List | 5s | Show empty state with retry |
| AI Query | 30s | Show "Taking longer than expected" |
| Image Upload | 60s | Cancel with error |
| Push Token Register | 5s | Retry on next app open |

### 11.5 Offline States

#### Supported Offline
- View cached trips
- View cached messages
- Compose message draft
- View cached media (thumbnails)

#### Blocked Offline
- Create trip
- Send message (queued)
- Upload media
- AI queries
- Payment operations

### 11.6 Missing Data Scenarios

- **Trip Not Found:** Show 404 page with "Back to Home"
- **User Profile Missing:** Create default profile on first access
- **No Payment Methods:** Show "Add payment method" prompt
- **No Trip Members:** Show creator as only member
- **No Messages:** Show empty state with "Start the conversation"
- **No Itinerary Items:** Show "Plan your trip" prompt

---

## 12. OUTPUT FORMAT

This MSPEC provides a complete technical deconstruction of the Chravel web application for conversion to iOS native (Swift/SwiftUI).

### Key Conversion Considerations

1. **State Management:** Replace React Query with native Swift async/await and @Observable
2. **Navigation:** Replace React Router with NavigationStack
3. **UI Components:** Replace Radix/Tailwind with SwiftUI native components
4. **Realtime:** Replace Supabase Realtime with native websocket handling
5. **Maps:** Use MapKit instead of Google Maps JS (or Google Maps iOS SDK)
6. **Storage:** Use SwiftData or CoreData for offline caching
7. **Authentication:** Use AuthenticationServices for Sign in with Apple
8. **Push Notifications:** Use UserNotifications framework

=== MSPEC END ===
