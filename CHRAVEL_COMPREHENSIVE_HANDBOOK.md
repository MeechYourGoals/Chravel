# CHRAVEL: COMPREHENSIVE PRODUCT HANDBOOK

**The Complete Guide to Every Feature, Pain Point Solved, and Edge Case Handled**

*For Investors, Developers, and Stakeholders*

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Vision & Market Position](#product-vision--market-position)
3. [Pain Points Solved](#pain-points-solved)
4. [Core Features & Capabilities](#core-features--capabilities)
5. [Advanced Features](#advanced-features)
6. [Technical Architecture](#technical-architecture)
7. [Edge Cases & Special Handling](#edge-cases--special-handling)
8. [Security & Compliance](#security--compliance)
9. [Monetization & Pricing](#monetization--pricing)
10. [Competitive Advantages](#competitive-advantages)
11. [Future Roadmap](#future-roadmap)

---

## Executive Summary

### What is Chravel?

**Chravel** is a next-generation collaborative trip management platform that transforms how people and organizations plan, execute, and experience travel. Built with React, TypeScript, and Supabase, Chravel serves three distinct market segments:

- **Consumer Users**: Personal trip planning with AI assistance
- **Professional Users**: Event management, tours, and team coordination
- **Enterprise Organizations**: Large-scale team travel and compliance management

### Key Value Propositions

| For Consumers | For Professionals | For Enterprises |
|---------------|-------------------|-----------------|
| AI-powered trip planning | Team coordination at scale | Compliance & security |
| Real-time collaboration | Financial management tools | White-label options |
| Expense splitting | Role-based access control | SSO/MFA integration |
| Media management | Multi-city tour support | Advanced analytics |
| Smart recommendations | Per-diem tracking | Custom integrations |

### Market Opportunity

**Total Addressable Market (TAM)**:
- **$1.4 Trillion** global travel market
- **817 million** international tourist arrivals annually
- **$11.4 billion** travel management software market by 2027

**Chravel addresses unmet needs across**:
- Personal travel planning (fragmented tools)
- Professional event management (complex logistics)
- Enterprise compliance (regulatory requirements)

---

## Product Vision & Market Position

### The Problem We Solve

Modern travelers face significant pain points:

1. **Fragmented Tools**: Planning requires 10+ apps (calendar, messages, expenses, maps, bookings)
2. **Poor Collaboration**: Existing tools don't enable real-time group planning
3. **Financial Complexity**: Splitting expenses across groups is manual and error-prone
4. **Information Overload**: Confirmations, itineraries, and details scattered across emails
5. **Professional Gap**: No single tool handles professional event/tour logistics comprehensively
6. **Compliance Burden**: Organizations struggle with travel compliance and reporting

### Our Solution

Chravel consolidates **all** trip planning, collaboration, and execution into one unified platform:

- **Single Source of Truth**: All trip information in one place
- **Real-Time Collaboration**: Chat, shared calendars, joint planning
- **AI-Powered Intelligence**: Smart recommendations and itinerary building
- **Financial Clarity**: Automated expense splitting and settlement
- **Professional Tools**: Team management, compliance, and reporting
- **Enterprise Grade**: Security, compliance, and integration capabilities

---

## Pain Points Solved

### For Individual Travelers

#### Pain Point #1: Information Fragmentation
**Problem**: Flight confirmations in email, hotel bookings in another app, activities in spreadsheets, restaurant recommendations in Notes.

**Chravel Solution**:
- ✅ **Unified Media Hub**: All confirmations, bookings, photos, and files in one place
- ✅ **AI Calendar Detector**: Automatically extracts events from emails and PDFs
- ✅ **Centralized Calendar**: All trip events in a shared, synchronized calendar
- ✅ **Link Aggregation**: All travel-related URLs organized and categorized

**Edge Cases Handled**:
- Multiple confirmation formats (PDF, HTML, plain text)
- Time zone conversions automatically handled
- Duplicate detection to prevent calendar clutter
- Offline access to all trip documents

---

#### Pain Point #2: Group Coordination Chaos
**Problem**: "Did everyone see the restaurant suggestion?" "Who's paying for the rental car?" "What time are we meeting?"

**Chravel Solution**:
- ✅ **Real-Time Chat**: Stream Chat integration with typing indicators and read receipts
- ✅ **Broadcast Messages**: Important announcements to all participants with delivery confirmation
- ✅ **Collaborative Calendar**: Everyone sees the same schedule, updates in real-time
- ✅ **Notification System**: Customizable alerts for messages, events, and changes
- ✅ **@Mentions**: Direct attention to specific people when needed

**Edge Cases Handled**:
- Participants joining mid-trip see full history
- Quiet hours respect time zones
- Offline message queuing and sync
- Message threading for organized discussions
- Sentiment analysis to detect potential conflicts

---

#### Pain Point #3: Expense Splitting Nightmare
**Problem**: "Who owes what?" "Did John pay me back?" Manual calculations, forgotten receipts, Venmo back-and-forth.

**Chravel Solution**:
- ✅ **Smart Expense Splitting**: Equal, custom, or percentage-based splits
- ✅ **Settlement Algorithm**: Calculates optimal payment paths to minimize transactions
- ✅ **Receipt Management**: Upload and AI-parse receipts automatically
- ✅ **Payment Method Storage**: Travel Wallet stores Venmo, Cash App, Zelle, PayPal, etc.
- ✅ **Balance Tracking**: Real-time "you owe" vs "owed to you" calculations
- ✅ **Settlement Confirmation**: Both parties confirm payment completion

**Edge Cases Handled**:
- Multi-currency expense tracking
- Partial payments and installments
- Group payment where only some people attended (subset splits)
- Payment method preferences per person
- Audit trail for all transactions
- Overdue payment reminders

---

#### Pain Point #4: Planning Paralysis
**Problem**: "Where should we eat?" "What should we do?" Endless Google searches, decision fatigue.

**Chravel Solution**:
- ✅ **AI Concierge**: Claude AI-powered assistant with full trip context
- ✅ **Personalized Recommendations**: Based on dietary restrictions, budget, vibe preferences
- ✅ **Place Voting System**: Upvote/downvote suggestions democratically
- ✅ **Distance Calculations**: All suggestions show distance from your basecamp
- ✅ **Smart Categories**: Filter by activity type, price range, accessibility

**Edge Cases Handled**:
- Conflicting preferences within group (vegan + foodie)
- Multiple dietary restrictions simultaneously
- Budget-conscious planning with splurge options
- Accessibility needs (wheelchair, EV charging, pet-friendly)
- Cultural and religious considerations (Halal, Kosher, LGBTQ+ friendly)

---

#### Pain Point #5: Memory & Media Management
**Problem**: Photos scattered across devices, no shared album, memories fade.

**Chravel Solution**:
- ✅ **Unified Photo Gallery**: All trip photos in one collaborative album
- ✅ **Auto-Organization**: AI tags photos by location, people, activities
- ✅ **Lazy Loading**: Performance-optimized for hundreds of photos
- ✅ **Video Support**: Upload and stream videos efficiently
- ✅ **Metadata Extraction**: EXIF data shows when/where photos were taken
- ✅ **Trip Export**: Generate beautiful PDF trip books with photos

**Edge Cases Handled**:
- Duplicate photo detection
- Orientation correction (EXIF-based)
- File size optimization for mobile uploads
- Offline photo queuing
- Video thumbnail generation
- Support for RAW and professional formats

---

### For Professional Users (Events, Tours, Sports)

#### Pain Point #6: Team Logistics at Scale
**Problem**: Managing 50-500 people across multiple cities with complex schedules, credentials, and roles.

**Chravel Solution**:
- ✅ **Unlimited Team Roster**: Support for teams of any size
- ✅ **Hierarchical Roles**: Custom roles with organizational chart visualization
- ✅ **Credential System**: AllAccess, Backstage, Guest, Restricted access levels
- ✅ **Emergency Contacts**: Complete contact info and medical data per person
- ✅ **Room Assignments**: Manage hotel rooms, occupants, check-in/out
- ✅ **Role-Based Channels**: Automatic communication channels per role
- ✅ **Multi-Language Broadcasts**: Send messages translated to multiple languages

**Edge Cases Handled**:
- Last-minute roster changes
- Duplicate credential requests
- Room preference conflicts
- Mixed role assignments (person with multiple roles)
- Hierarchy changes mid-trip
- Cross-timezone coordination

---

#### Pain Point #7: Event Scheduling Complexity
**Problem**: Load-in times, sound checks, show times, travel between venues - overlapping schedules and conflicts.

**Chravel Solution**:
- ✅ **Professional Event Types**: Load-in, Sound-check, Rehearsal, Show, Load-out, Travel, Meeting
- ✅ **Priority Levels**: Critical, High, Medium, Low with visual indicators
- ✅ **Conflict Detection**: Automatically identify scheduling conflicts
- ✅ **Participant Assignment**: Assign specific people to specific events
- ✅ **Timeline Visualization**: See entire tour schedule at a glance
- ✅ **Multi-City Support**: Manage tour across multiple venues/cities

**Edge Cases Handled**:
- Overlapping events for different team subsets
- Travel time calculations between venues
- Time zone changes during tour
- Weather delays and rescheduling
- Last-minute venue changes
- Partial team attendance at events

---

#### Pain Point #8: Financial Complexity (Professional)
**Problem**: Per diem tracking, expense advances, settlement calculations, venue guarantees, merchandise revenue.

**Chravel Solution**:
- ✅ **Per Diem System**: Define daily rates with individual customization
- ✅ **Advance Tracking**: Record advances per participant with automatic deductions
- ✅ **Balance Calculations**: Real-time balance per person
- ✅ **Settlement Records**: Track venue earnings, guarantees, backend percentages, merch revenue
- ✅ **Budget Breakdown**: Detailed category-based budgeting
- ✅ **Financial Reports**: Export comprehensive financial summaries

**Edge Cases Handled**:
- Mid-trip rate changes
- Partial day per diem calculations
- Currency conversions across tour cities
- Mixed payment methods
- Settlement disputes and audit trails
- Tax withholding and documentation

---

#### Pain Point #9: Compliance & Safety
**Problem**: Visa requirements, union rules, NCAA regulations, insurance compliance, medical tracking.

**Chravel Solution**:
- ✅ **Compliance Tracking**: Visa, Union, NCAA, Insurance, Safety rules
- ✅ **Deadline Management**: Track compliance deadlines with alerts
- ✅ **Document Attachments**: Store compliance documents securely
- ✅ **Status Monitoring**: Compliant, Warning, Violation states
- ✅ **Medical Logs**: Track injuries, illnesses, treatments, medications
- ✅ **Severity Tracking**: Minor, Moderate, Severe classifications
- ✅ **Follow-Up Scheduling**: Automatic reminders for medical follow-ups

**Edge Cases Handled**:
- Multiple compliance frameworks simultaneously
- International visa requirements across multi-country tours
- Privacy-sensitive medical information
- HIPAA compliance for medical logs
- Restricted activity flags during recovery
- Emergency medical contact information

---

#### Pain Point #10: Media & Sponsorship Management
**Problem**: Press interviews, photo shoots, sponsor deliverables, activation tracking.

**Chravel Solution**:
- ✅ **Media Slot Scheduling**: Interview, Photo-shoot, Press-conference, Podcast types
- ✅ **Outlet Tracking**: Media outlet, contact person, duration, location
- ✅ **Sponsor Activation Management**: Track sponsor deliverables and deadlines
- ✅ **Status Tracking**: Pending, In-progress, Completed states
- ✅ **Multiple Sponsor Tiers**: Platinum, Gold, Silver, Bronze with logo management
- ✅ **Exhibitor Management**: Booth assignments, company details

**Edge Cases Handled**:
- Concurrent media commitments
- Sponsor conflict resolution (competing brands)
- Last-minute cancellations
- Deliverable deadline extensions
- Multi-stage deliverables
- Media credential management

---

### For Enterprise Organizations

#### Pain Point #11: Enterprise-Scale Coordination
**Problem**: Managing hundreds of employees across teams, departments, and trips.

**Chravel Solution**:
- ✅ **Organization Management**: Centralized org with multiple trips and teams
- ✅ **Seat-Based Licensing**: Flexible seat allocation across organization
- ✅ **Member Management**: Bulk upload via CSV/Excel, invitation tracking
- ✅ **Role Assignment**: Owner, Admin, Member with granular permissions
- ✅ **Usage Analytics**: Dashboard showing seat utilization and feature adoption
- ✅ **Billing Management**: Centralized subscription and payment handling

**Edge Cases Handled**:
- Seat reallocation when members leave
- Trial period management
- Subscription tier upgrades/downgrades
- Bulk member operations (add/remove/suspend)
- Multi-department trip segregation
- Cross-functional team trips

---

#### Pain Point #12: Security & Compliance (Enterprise)
**Problem**: GDPR, HIPAA, SOC 2, data residency, encryption requirements.

**Chravel Solution**:
- ✅ **High Privacy Mode**: End-to-end encryption (E2EE)
- ✅ **Compliance Suites**: GDPR, HIPAA Ready, SOC 2
- ✅ **SSO/MFA Integration**: Enterprise authentication
- ✅ **Data Residency**: Configurable data location (Enterprise+)
- ✅ **Audit Logging**: Comprehensive activity logs
- ✅ **Role-Based Access Control**: Granular permissions system
- ✅ **Zero-Knowledge Architecture**: High Privacy mode ensures server can't read content

**Edge Cases Handled**:
- GDPR data export requests
- GDPR right-to-be-forgotten
- HIPAA-compliant medical data storage
- Multi-region data compliance
- Encryption key rotation
- Session timeout policies
- Failed login attempt tracking

---

#### Pain Point #13: Integration Complexity
**Problem**: Travel booking systems (Saber, Concur), financial systems, HR systems need to connect.

**Chravel Solution**:
- ✅ **Third-Party Integrations**: Saber, Concur, booking systems
- ✅ **API Access**: Full REST API for custom integrations (Enterprise)
- ✅ **Webhook Support**: Real-time event notifications
- ✅ **Data Export**: CSV, Excel, PDF export for all data
- ✅ **White-Label Options**: Custom branding for Enterprise
- ✅ **Custom Feature Development**: Available in Enterprise+ tier

**Edge Cases Handled**:
- API rate limiting
- Failed webhook retries
- Data format mismatches
- Authentication failures
- Partial data sync recovery
- Integration versioning

---

## Core Features & Capabilities

### 1. Trip Management System

#### Consumer Trip Creation
**What It Does**: Create personal trips with comprehensive metadata, preferences, and collaboration.

**Key Features**:
- 15 trip categories (Work, Leisure, Family, Music, Sports, Vacation, Foodie, Adventure, Wellness, Cultural, Romantic, Bachelor/Bachelorette, Reunion, Shopping, Nightlife)
- Date range with flexible modification
- Location with GPS coordinates
- Cover photo management
- Description and notes
- Participant invitation and management
- Trip archiving with recovery

**Developer Details**:
```typescript
// src/types/trip.ts
interface ConsumerTrip {
  id: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  description?: string;
  cover_photo_url?: string;
  category?: TripCategory;
  created_by: string;
  created_at: string;
  archived: boolean;
  basecamp?: BasecampLocation;
  preferences: TripPreferences;
}

// Trip categories
type TripCategory =
  | 'work' | 'leisure' | 'family' | 'music' | 'sports'
  | 'vacation' | 'foodie' | 'adventure' | 'wellness'
  | 'cultural' | 'romantic' | 'bachelor' | 'reunion'
  | 'shopping' | 'nightlife';
```

**Pain Points Solved**:
- No more scattered trip information across apps
- Group visibility into trip details
- Category-based organization for multiple trips
- Easy trip archival for completed travel

**Edge Cases**:
- Concurrent edits by multiple users (Supabase Realtime resolves)
- Invalid date ranges (validation prevents)
- Missing cover photos (default placeholder provided)
- Trip without participants (creator-only trip)

---

#### Pro Trip Management
**What It Does**: Professional-grade trip management for events, tours, and team coordination.

**Key Features**:
- **Pro Categories**: Business Travel, School Trip, Content, Tour, Sports (Pro/Collegiate/Youth)
- **Team Roster**: Unlimited members with custom roles
- **Credential Levels**: AllAccess, Backstage, Guest, Restricted
- **Room Assignments**: Hotel room management with occupants
- **Advanced Scheduling**: Load-in, Sound-check, Rehearsal, Show, Load-out, Travel, Meeting
- **Per Diem Tracking**: Daily rate management with balances
- **Settlement Records**: Venue earnings, guarantees, merchandise revenue
- **Compliance Rules**: Visa, Union, NCAA, Insurance, Safety
- **Medical Logs**: Injury/illness/treatment tracking with severity
- **Media Slots**: Interview, Photo-shoot, Press-conference scheduling
- **Sponsor Activations**: Deliverable tracking with deadlines

**Developer Details**:
```typescript
// src/types/pro-trip.ts
interface ProTripData {
  roster: TeamMember[];
  rooms: RoomAssignment[];
  schedule: ScheduleEvent[];
  perDiemData: PerDiemRecord[];
  settlements: SettlementRecord[];
  medicalLogs: MedicalLog[];
  complianceRules: ComplianceRule[];
  mediaSlots: MediaSlot[];
  sponsorActivations: SponsorActivation[];
  budget: DetailedBudget;
}

// Team member with full details
interface TeamMember {
  id: string;
  name: string;
  role: string;
  credential_level: 'AllAccess' | 'Backstage' | 'Guest' | 'Restricted';
  emergency_contact: EmergencyContact;
  reports_to?: string; // org hierarchy
  phone_number?: string;
  email: string;
}

// Schedule event
interface ScheduleEvent {
  id: string;
  type: 'Load-in' | 'Sound-check' | 'Rehearsal' | 'Show' | 'Load-out' | 'Travel' | 'Meeting';
  start_time: string;
  end_time: string;
  location: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  participants: string[]; // IDs
  notes?: string;
}
```

**Pain Points Solved**:
- Professional event logistics in one platform
- Complex team coordination simplified
- Financial tracking and settlement automation
- Compliance and safety centralized
- Multi-city tour management

**Edge Cases**:
- Last-minute roster changes (real-time sync)
- Overlapping events for subsets of team
- Mixed credential requirements
- Per diem adjustments mid-trip
- Medical privacy considerations
- Settlement disputes with audit trail

---

#### Event Management
**What It Does**: Specialized features for conferences, festivals, and events with attendees.

**Key Features**:
- **Event Setup**: Capacity, registration status, date range
- **Event Tracks**: Multi-track system with color coding
- **Speaker Management**: 7 performer types (Speaker, Comedian, Musician, DJ, Host, Panelist, Officiant)
- **Sponsorship Tiers**: Platinum, Gold, Silver, Bronze
- **Exhibitor Management**: Booth assignments
- **Attendee RSVP**: Going, Maybe, Not-going, Not-answered tracking
- **Check-In System**: Attendance tracking
- **Event Controls**: Toggle chat, polls, media uploads, AI concierge

**Developer Details**:
```typescript
// src/types/event.ts
interface EventData {
  tracks: EventTrack[];
  speakers: Speaker[];
  sessions: Session[];
  sponsors: Sponsor[];
  exhibitors: Exhibitor[];
  attendees: Attendee[];
  rsvp_status: RSVPStatus[];
  settings: EventSettings;
}

interface Speaker {
  id: string;
  name: string;
  performer_type: 'Speaker' | 'Comedian' | 'Musician' | 'DJ' | 'Host' | 'Panelist' | 'Officiant';
  bio: string;
  avatar_url?: string;
  social_links: SocialLinks;
  sessions: string[]; // session IDs
}
```

**Pain Points Solved**:
- Event coordination at scale
- Speaker and session management
- Sponsor relationship tracking
- Attendee engagement and check-in
- Multi-track scheduling

**Edge Cases**:
- Waitlist management when capacity reached
- Speaker cancellations and replacements
- Session time conflicts
- Exhibitor booth conflicts
- Late attendee registrations

---

### 2. Communication System

#### Real-Time Trip Chat
**What It Does**: Stream Chat-powered messaging for trip participants.

**Key Features**:
- Text messaging with rich formatting
- File attachments (images, videos, documents)
- Link previews (auto-generated)
- Typing indicators
- Read receipts
- Message reactions
- @mentions with notifications
- Hashtag organization
- Message edit/delete
- Thread support

**Developer Details**:
```typescript
// Stream Chat React integration
import { Chat, Channel, MessageList, MessageInput } from 'stream-chat-react';

// src/components/chat/TripChat.tsx
// Connects to Stream Chat with trip channel
// Implements custom message rendering
// Handles file uploads via Supabase Storage
```

**Pain Points Solved**:
- Real-time group communication
- Persistent message history
- Multimedia sharing
- Organized discussions via threads

**Edge Cases**:
- Offline message queueing
- Large file uploads (chunked)
- Message flooding (rate limiting)
- Inappropriate content (moderation)
- Message search across large histories

---

#### Broadcast System
**What It Does**: One-to-many messaging with delivery tracking.

**Key Features**:
- **Consumer Broadcasts**: Simple announcements with category (chill, logistics, urgent)
- **Pro Broadcasts**: Role-based targeting with multi-language translation
- Message templating
- Scheduled delivery
- Delivery confirmation tracking
- Read receipts per recipient
- Message analytics

**Developer Details**:
```typescript
// src/types/broadcast.ts
interface BroadcastMessage {
  id: string;
  trip_id: string;
  created_by: string;
  message: string;
  target_roles?: string[]; // Pro feature
  priority: 'normal' | 'urgent';
  translations?: { [lang: string]: string }; // Pro feature
  sent_at: string;
  delivery_status: DeliveryStatus[];
}

interface DeliveryStatus {
  user_id: string;
  delivered: boolean;
  read: boolean;
  read_at?: string;
}
```

**Pain Points Solved**:
- Important announcements reach everyone
- Role-specific messaging (Pro)
- Language barriers (translation)
- Delivery confirmation

**Edge Cases**:
- Partial delivery failures
- Recipients joining after broadcast
- Message retraction/editing
- Translation accuracy issues

---

#### Role-Based Channels (Pro)
**What It Does**: Automatic communication channels per role type.

**Key Features**:
- Auto-created channels for each role
- Custom channels with manual membership
- Private vs public channels
- Per-channel notification settings
- Unread message counts
- Member lists with roles
- Full chat functionality per channel

**Developer Details**:
```typescript
// src/services/channelService.ts
export const channelService = {
  createRoleChannel(tripId: string, role: string) {
    // Auto-creates channel for role
    // Adds all members with that role
  },

  createCustomChannel(tripId: string, name: string, members: string[]) {
    // Custom membership channel
  }
};
```

**Pain Points Solved**:
- Role-specific discussions without noise
- Organized team communication
- Privacy for sensitive discussions

**Edge Cases**:
- Dynamic role membership changes
- Cross-role conversations
- Channel archival when role deprecated
- Permission conflicts

---

### 3. Calendar & Scheduling

#### Collaborative Trip Calendar
**What It Does**: Shared calendar for all trip events.

**Key Features**:
- **Event Types**: Dining, Lodging, Activity, Transportation, Entertainment, Budget, Custom
- Manual event creation
- AI-extracted events from documents
- Events added from Places
- Confirmation number tracking
- Day/Week/Month views
- Export to iCal format
- Sync with external calendars

**Developer Details**:
```typescript
// src/types/calendar.ts
interface CalendarEvent {
  id: string;
  trip_id: string;
  title: string;
  event_type: EventType;
  start_time: string;
  end_time?: string;
  location?: string;
  confirmation_number?: string;
  source: 'manual' | 'ai' | 'places';
  created_by: string;
  participants?: string[];
  notes?: string;
}

type EventType =
  | 'dining' | 'lodging' | 'activity'
  | 'transportation' | 'entertainment'
  | 'budget' | 'custom';
```

**Pain Points Solved**:
- Scattered event information consolidated
- Group visibility into schedule
- Automatic event extraction from confirmations
- Calendar synchronization

**Edge Cases**:
- Time zone handling across multi-city trips
- All-day events
- Recurring events
- Event conflicts
- Past event modifications

---

#### AI Calendar Detector (Frequent Chraveler+)
**What It Does**: Automatically extract events from uploaded documents.

**Key Features**:
- Parse PDFs, emails, confirmations
- Extract event details (title, time, location, confirmation #)
- Auto-categorize event types
- Smart time detection
- Add directly to trip calendar
- Manual override for corrections

**Developer Details**:
```typescript
// src/services/universalConciergeService.ts
async function extractEventsFromDocument(file: File): Promise<CalendarEvent[]> {
  // Uses Claude AI to parse document
  // Extracts structured event data
  // Returns array of calendar events
}
```

**Pain Points Solved**:
- Manual calendar entry eliminated
- Confirmation details never lost
- Time and date parsing errors minimized

**Edge Cases**:
- Non-standard confirmation formats
- Ambiguous date/time formats
- Multiple events in one document
- Incorrect AI extraction (manual override)

---

### 4. Financial Management

#### Payment Splitting
**What It Does**: Divide expenses among participants with flexible split methods.

**Key Features**:
- **Split Methods**: Equal, Custom amounts, Percentage-based
- Participant selection (full group or subset)
- Multi-currency support
- Category tagging
- Receipt upload with AI parsing
- Payment method selection from Travel Wallet
- Status tracking (Pending, Confirmed, Settled)
- Settlement confirmation by both parties

**Developer Details**:
```typescript
// src/types/payment.ts
interface PaymentSplit {
  id: string;
  trip_id: string;
  created_by: string; // who paid
  amount: number;
  currency: string;
  description: string;
  category: ExpenseCategory;
  split_type: 'equal' | 'custom' | 'percentage';
  participants: ParticipantSplit[];
  receipt_url?: string;
  preferred_methods: PaymentMethod[];
  status: 'pending' | 'confirmed' | 'settled';
  settled_at?: string;
  version: number; // audit trail
}

interface ParticipantSplit {
  user_id: string;
  amount: number;
  percentage?: number;
  confirmed: boolean;
}
```

**Pain Points Solved**:
- Manual expense calculation eliminated
- Fair split methods (equal, custom, percentage)
- Receipt organization
- Payment tracking
- Settlement simplification

**Edge Cases**:
- Rounding errors in splits (handled algorithmically)
- Partial group expenses (subset splits)
- Multi-currency conversions
- Split modifications after creation (versioning)
- Disputed amounts (audit trail)

---

#### Settlement Algorithm
**What It Does**: Calculate optimal payment paths to minimize number of transactions.

**Key Features**:
- Net balance calculation per person
- Optimize payment paths (minimize transactions)
- Suggest settlement order
- Payment method matching
- Confirmation workflow

**Example**:
```
Before optimization:
- Alice owes Bob $50
- Alice owes Carol $30
- Bob owes Carol $20

After optimization:
- Alice pays Carol $60 (simplified from 3 transactions to 2)
- Bob pays Carol $20
```

**Developer Details**:
```typescript
// src/services/paymentService.ts
function calculateSettlements(splits: PaymentSplit[]): Settlement[] {
  // 1. Calculate net balance per person
  // 2. Sort by balance (negative to positive)
  // 3. Match highest debtor with highest creditor
  // 4. Minimize number of transfers
  // 5. Return settlement instructions
}
```

**Pain Points Solved**:
- Reduced transaction complexity
- Clear settlement instructions
- Optimal payment routing

**Edge Cases**:
- Circular debts
- Equal net balances
- All debtors/all creditors
- Floating point precision

---

#### Travel Wallet
**What It Does**: Store loyalty programs and payment methods for quick access.

**Key Features**:
- **Loyalty Programs**: Airline (SkyMiles, AAdvantage), Hotel (Bonvoy, Honors), Rental Car
- **Payment Methods**: Venmo, Cash App, Zelle, PayPal, Apple Cash, Credit Cards, Cash
- Preferred program/method marking
- Visibility toggles
- Quick access during settlements
- Integration with payment splitting

**Developer Details**:
```typescript
// src/types/wallet.ts
interface LoyaltyProgram {
  id: string;
  user_id: string;
  type: 'airline' | 'hotel' | 'rental_car';
  provider: string; // "Delta", "Marriott", etc.
  program_name: string; // "SkyMiles", "Bonvoy"
  membership_number: string;
  tier_level?: string;
  preferred: boolean;
}

interface PaymentMethod {
  id: string;
  user_id: string;
  type: 'venmo' | 'cashapp' | 'zelle' | 'paypal' | 'apple_cash' | 'credit_card' | 'cash' | 'other';
  identifier: string; // username/handle
  display_name: string;
  preferred: boolean;
  visible: boolean;
}
```

**Pain Points Solved**:
- Quick access to payment information
- No more asking "What's your Venmo?"
- Loyalty program consolidation

**Edge Cases**:
- Multiple programs of same type
- Expired memberships
- Payment method changes mid-trip

---

### 5. Places & Basecamp System

#### Basecamp Management
**What It Does**: Define a "home base" for the trip with distance calculations.

**Key Features**:
- Set primary accommodation/meeting point
- Store address and GPS coordinates
- Calculate distances to all places
- Multiple distance modes (driving, walking, straight-line)
- Auto-update distances when basecamp changes
- Display prominently on map

**Developer Details**:
```typescript
// src/types/basecamp.ts
interface BasecampLocation {
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  type: 'hotel' | 'airbnb' | 'home' | 'other';
  check_in?: string;
  check_out?: string;
  contact_info?: string;
}

// Distance calculation
function calculateDistance(
  basecamp: Coordinates,
  place: Coordinates,
  mode: 'driving' | 'walking' | 'straight-line'
): number {
  // Returns distance in miles or km
}
```

**Pain Points Solved**:
- "How far is that from where we're staying?"
- Central meeting point definition
- Distance-based planning

**Edge Cases**:
- Multiple accommodations (use primary)
- Changing basecamp mid-trip
- No basecamp set (use trip location)

---

#### Places Management
**What It Does**: Save and organize locations of interest.

**Key Features**:
- **Place Types**: Restaurant, Attraction, Hotel, Activity, Fitness, Nightlife, Transportation
- Save place with URL, address, coordinates
- Distance from basecamp
- Category filtering
- Voting system (thumbs up/down)
- Comments and collaboration
- Add to calendar from places
- Map visualization

**Developer Details**:
```typescript
// src/types/places.ts
interface Place {
  id: string;
  trip_id: string;
  name: string;
  type: PlaceType;
  address?: string;
  coordinates?: Coordinates;
  url?: string;
  distance_from_basecamp?: number;
  added_by: string;
  votes: PlaceVote[];
  comments: PlaceComment[];
}

type PlaceType =
  | 'restaurant' | 'attraction' | 'hotel'
  | 'activity' | 'fitness' | 'nightlife'
  | 'transportation';
```

**Pain Points Solved**:
- Scattered place recommendations
- "Where was that restaurant we saw?"
- Group consensus on places
- Distance-aware planning

**Edge Cases**:
- Duplicate places (detection)
- Moved/closed businesses
- Invalid addresses
- Places without coordinates

---

#### Google Maps Integration
**What It Does**: Interactive maps with place search and directions.

**Key Features**:
- Embedded Google Maps display
- Place search within destination
- Place details (hours, ratings, reviews)
- Directions from basecamp
- Map controls (zoom, pan, full-screen)
- Place markers with info windows
- Route planning

**Developer Details**:
```typescript
// Google Maps JavaScript API integration
// src/integrations/googleMaps.ts

export const googleMapsService = {
  searchPlaces(query: string, location: Coordinates): Promise<Place[]>,
  getPlaceDetails(placeId: string): Promise<PlaceDetails>,
  getDirections(origin: Coordinates, destination: Coordinates): Promise<Route>,
  calculateDistance(origin: Coordinates, destination: Coordinates): Promise<number>
};
```

**Pain Points Solved**:
- Embedded map viewing
- Place discovery
- Directions and navigation
- Real-time traffic information

**Edge Cases**:
- API quota limits
- Invalid place IDs
- No results for query
- Map loading failures

---

### 6. AI Concierge System

#### Claude AI-Powered Assistant
**What It Does**: Answer trip-related questions using full trip context.

**Key Features**:
- **Context Window Includes**:
  - Trip details (dates, location, participants)
  - Chat messages and history
  - Uploaded files and documents
  - Photos and media metadata
  - Calendar events
  - User preferences (dietary, vibe, accessibility)
  - Weather and location data
  - Basecamp location
  - Places saved to trip

- **Capabilities**:
  - Answer questions about trip
  - Provide recommendations (restaurants, activities)
  - Suggest itinerary optimizations
  - Extract information from documents
  - Calculate logistics (travel time, distances)
  - Source attribution
  - Actionable suggestions

**Rate Limits by Tier**:
- Free: 5 queries per trip
- Explorer: 10 queries per trip
- Frequent Chraveler: Unlimited

**Developer Details**:
```typescript
// src/services/universalConciergeService.ts
export async function queryConcierge(
  tripId: string,
  query: string
): Promise<ConciergeResponse> {
  // 1. Aggregate trip context
  const context = await aggregateTripContext(tripId);

  // 2. Check rate limits
  await checkUsageLimit(tripId, userId);

  // 3. Build prompt with context
  const prompt = buildPrompt(query, context);

  // 4. Call Claude API
  const response = await callClaudeAPI(prompt);

  // 5. Parse response with sources
  return parseResponse(response);
}
```

**Pain Points Solved**:
- Trip planning assistance without leaving app
- Personalized recommendations based on group
- Information extraction from documents
- Decision support

**Edge Cases**:
- Rate limit exceeded (upgrade prompt)
- High Privacy mode (disabled)
- Insufficient context for accurate answer
- Conflicting preferences within group

---

### 7. Media Management

#### Unified Media Hub
**What It Does**: Centralized media storage and organization.

**Key Features**:
- **Supported Types**: Photos, Videos, Audio, Files (PDF, DOCX, XLSX), Links
- Batch upload with drag-and-drop
- Photo grid with lazy loading
- Lightbox viewer
- AI-powered tagging
- EXIF metadata extraction
- Location from photos (GPS)
- Search and filter
- Category organization

**Developer Details**:
```typescript
// src/types/media.ts
interface MediaFile {
  id: string;
  trip_id: string;
  file_url: string;
  file_type: 'photo' | 'video' | 'audio' | 'file';
  file_name: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  source: 'chat' | 'upload' | 'import';
  metadata?: MediaMetadata;
  tags?: string[];
}

interface MediaMetadata {
  exif?: ExifData;
  location?: Coordinates;
  date_taken?: string;
  camera?: string;
  dimensions?: { width: number; height: number };
}
```

**Pain Points Solved**:
- Scattered photos across devices
- No shared trip album
- Difficult to find specific photo
- Lost context (when/where taken)

**Edge Cases**:
- Large file uploads (chunked)
- Unsupported file types (validation)
- Duplicate detection
- Orientation correction
- Video thumbnail generation
- Storage quota management

---

#### Link Aggregation
**What It Does**: Organize all trip-related links in one place.

**Key Features**:
- Automatic link extraction from chat
- Manual link addition
- Link categories (Housing, Eats, Activities, Custom)
- Link preview (title, description, thumbnail)
- Voting system (upvote/downvote)
- Pin important links
- Open in new tab

**Developer Details**:
```typescript
// src/types/links.ts
interface TripLink {
  id: string;
  trip_id: string;
  url: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  category: 'housing' | 'eats' | 'activities' | 'custom';
  added_by: string;
  source: 'chat' | 'manual';
  votes: LinkVote[];
  pinned: boolean;
}
```

**Pain Points Solved**:
- Lost links in chat history
- Disorganized bookmarks
- No group consensus on links

**Edge Cases**:
- Invalid URLs
- Link preview generation failures
- Dead links (404)
- Duplicate links

---

### 8. Tasks & Checklists

#### Task Management System
**What It Does**: Create and track to-do items for the trip.

**Key Features**:
- **Task Types**: Regular tasks, Polls (group decisions), Assignments
- Title and description
- Due date and time
- Multi-person assignment
- Completion tracking per person
- Task history
- Priority indicators
- Sort/filter by status, assignee, due date

**Developer Details**:
```typescript
// src/types/tasks.ts
interface TripTask {
  id: string;
  trip_id: string;
  title: string;
  description?: string;
  type: 'task' | 'poll' | 'assignment';
  due_date?: string;
  assigned_to: string[]; // user IDs
  created_by: string;
  completed_by: { user_id: string; completed_at: string }[];
  priority?: 'low' | 'medium' | 'high';
}
```

**Pain Points Solved**:
- Forgotten tasks and to-dos
- Unclear responsibilities
- Missed deadlines

**Edge Cases**:
- Overdue tasks
- Task assigned to user who left trip
- Duplicate tasks
- Tasks without assignees

---

### 9. Notifications System

#### Multi-Channel Notifications
**What It Does**: Keep users informed across push, email, and SMS.

**Key Features**:
- **Notification Types**:
  - Trip member joins/leaves
  - New messages and @mentions
  - Calendar reminders
  - Payment requests/confirmations
  - Broadcast messages
  - Media uploads
  - Task assignments
  - Trip updates

- **Delivery Channels**: Push (web/mobile), Email, SMS (Enterprise+)
- **Granular Control**: Per-notification-type preferences
- **Quiet Hours**: Mute notifications during specified hours
- **Notification Center**: Centralized inbox with history

**Developer Details**:
```typescript
// src/services/notificationService.ts
export const notificationService = {
  async send(
    userId: string,
    notification: Notification
  ) {
    // 1. Check user preferences
    const prefs = await getUserPreferences(userId);

    // 2. Check quiet hours
    if (isQuietHours(prefs.quiet_hours)) return;

    // 3. Send via enabled channels
    if (prefs.push_enabled) await sendPush(notification);
    if (prefs.email_enabled) await sendEmail(notification);
    if (prefs.sms_enabled) await sendSMS(notification);

    // 4. Store in notification center
    await storeNotification(notification);
  }
};
```

**Pain Points Solved**:
- Missed important updates
- Notification overload
- No central notification history

**Edge Cases**:
- Push permission denied (fallback to email)
- Quiet hours across time zones
- Notification batching to prevent spam
- Failed delivery retries

---

### 10. Trip Pins

#### Location & Item Pinning
**What It Does**: Mark important locations or items within trip.

**Key Features**:
- **Pin Types**: Location, Event, Link, People, Note
- Pin with title, description, location
- Map visualization of pinned locations
- Edit/delete pins
- Rearrange pin order
- Pin archival
- Visibility settings (public, private, role-based)
- Comments on pins

**Developer Details**:
```typescript
// src/types/pins.ts
interface TripPin {
  id: string;
  trip_id: string;
  type: 'location' | 'event' | 'link' | 'people' | 'note';
  title: string;
  description?: string;
  location?: Coordinates;
  reference_id?: string; // ID of linked event/link/person
  created_by: string;
  visibility: 'public' | 'private' | 'role_based';
  order: number;
  archived: boolean;
}
```

**Pain Points Solved**:
- Important locations forgotten
- Key information buried in chat
- Quick reference needed

**Edge Cases**:
- Pins referencing deleted items
- Map pins without coordinates
- Order conflicts during reordering

---

### 11. Pro/Enterprise Features

#### Team Roster & Hierarchy
**What It Does**: Manage large teams with organizational structure.

**Key Features**:
- Unlimited team members
- Custom role definitions
- Hierarchical structure (reports-to relationships)
- Org chart visualization
- Emergency contact information
- Credential level assignment
- Bulk member import (CSV/Excel)
- Team directory export

**Developer Details**:
```typescript
// src/types/pro-trip.ts
interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  credential_level: CredentialLevel;
  reports_to?: string; // manager's ID
  emergency_contact: EmergencyContact;
  dietary_restrictions?: string[];
  medical_info?: string; // encrypted
}

type CredentialLevel =
  | 'AllAccess'
  | 'Backstage'
  | 'Guest'
  | 'Restricted';
```

**Pain Points Solved**:
- Team coordination at scale
- Org chart visibility
- Emergency contact accessibility
- Credential management

**Edge Cases**:
- Circular reporting relationships (validation prevents)
- Orphaned team members after manager removal
- Bulk import with invalid data
- Mixed credential requirements

---

#### Compliance & Safety Tracking
**What It Does**: Track regulatory compliance and safety requirements.

**Key Features**:
- **Compliance Categories**: Visa, Union, NCAA, Insurance, Safety
- Deadline tracking with alerts
- Document attachment
- Status monitoring (Compliant, Warning, Violation)
- Audit trail
- Medical log tracking
- Severity levels (Minor, Moderate, Severe)
- Privacy-protected health information

**Developer Details**:
```typescript
// src/types/compliance.ts
interface ComplianceRule {
  id: string;
  trip_id: string;
  category: 'visa' | 'union' | 'ncaa' | 'insurance' | 'safety';
  description: string;
  deadline?: string;
  status: 'compliant' | 'warning' | 'violation';
  assigned_to?: string;
  documents: string[]; // file URLs
  notes?: string;
}

interface MedicalLog {
  id: string;
  trip_id: string;
  participant_id: string;
  type: 'injury' | 'illness' | 'checkup' | 'therapy' | 'medication';
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  treatment_provider?: string;
  status: 'active' | 'resolved' | 'monitoring';
  follow_up_date?: string;
  restricted_activity: boolean;
  private: boolean; // privacy flag
}
```

**Pain Points Solved**:
- Compliance tracking centralized
- Deadline visibility
- Audit trail for regulations
- Medical information secure

**Edge Cases**:
- Multiple compliance frameworks simultaneously
- Privacy of medical logs (encryption)
- Deadline extensions
- Retroactive compliance documentation

---

#### Organization Management (Enterprise)
**What It Does**: Multi-trip organization with centralized billing and member management.

**Key Features**:
- Organization profile
- Seat-based licensing (25 to unlimited)
- Centralized billing
- Bulk member operations
- Usage analytics
- Multiple trips under one org
- SSO/MFA integration (Enterprise tier)
- Custom branding (Enterprise tier)
- API access (Enterprise tier)

**Developer Details**:
```typescript
// src/types/organization.ts
interface Organization {
  id: string;
  name: string;
  display_name: string;
  subscription_tier: 'starter' | 'growing' | 'enterprise' | 'enterprise_plus';
  seat_limit: number;
  seats_used: number;
  billing_email: string;
  stripe_subscription_id?: string;
  subscription_status: 'active' | 'trial' | 'expired' | 'cancelled';
  trial_end_date?: string;
  created_at: string;
  settings: OrganizationSettings;
}

interface OrganizationSettings {
  sso_enabled: boolean;
  mfa_required: boolean;
  custom_branding: boolean;
  api_access: boolean;
  white_label: boolean;
  data_residency?: 'us' | 'eu' | 'asia';
  compliance_suite: ('gdpr' | 'hipaa' | 'soc2')[];
}
```

**Pain Points Solved**:
- Centralized org-wide management
- Simplified billing
- Member lifecycle management
- Usage visibility

**Edge Cases**:
- Seat limit exceeded (graceful handling)
- Subscription expiration during active trip
- Member reallocation between trips
- Org hierarchy changes

---

### 12. Privacy & Security

#### Privacy Modes
**What It Does**: Choose between convenience (Standard) and privacy (High Privacy).

**Standard Privacy Mode**:
- AI Concierge enabled
- Smart suggestions active
- Server-side encryption
- AI has data access
- Maximum convenience
- SOC 2, GDPR Basic compliance

**High Privacy Mode**:
- AI Concierge disabled
- No smart suggestions
- End-to-End encryption (E2EE)
- Zero-knowledge architecture
- Server cannot read content
- SOC 2, GDPR Enhanced, HIPAA Ready

**Developer Details**:
```typescript
// src/types/privacy.ts
interface TripPrivacySettings {
  mode: 'standard' | 'high_privacy';
  encryption_level: 'server_side' | 'end_to_end';
  ai_access_allowed: boolean;
  compliance_level: 'basic' | 'enhanced' | 'hipaa';
}

// E2EE implementation
class E2EEService {
  async encryptMessage(message: string, recipients: string[]): Promise<EncryptedMessage> {
    // Encrypt message with recipient public keys
  }

  async decryptMessage(encryptedMessage: EncryptedMessage): Promise<string> {
    // Decrypt with user's private key
  }
}
```

**Pain Points Solved**:
- Privacy concerns addressed
- Compliance requirements met
- User control over data access

**Edge Cases**:
- Switching modes mid-trip (re-encryption required)
- E2EE key management
- Lost encryption keys (recovery flow)
- New member joining E2EE trip

---

#### Authentication & Authorization
**What It Does**: Secure user authentication and role-based access control.

**Key Features**:
- Email/password authentication
- OAuth (Google, Apple)
- Multi-factor authentication (MFA)
- SSO integration (Enterprise)
- Session management
- Secure password reset
- Role-Based Access Control (RBAC)
- Row-Level Security (Supabase RLS)

**Developer Details**:
```typescript
// Supabase Auth integration
// Row-Level Security policies ensure users only access their data

// Example RLS policy
CREATE POLICY "Users can view trips they're members of"
ON trips FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM trip_members
    WHERE trip_id = trips.id
  )
);
```

**Pain Points Solved**:
- Secure authentication
- Fine-grained permissions
- Enterprise SSO integration

**Edge Cases**:
- Failed login attempts (rate limiting)
- Session expiration during active use
- OAuth provider downtime (fallback)
- MFA device loss (recovery codes)

---

### 13. Export & Reporting

#### PDF Trip Export
**What It Does**: Generate comprehensive trip summary as PDF.

**Key Features**:
- **Contents**: Cover page, itinerary, participants, accommodations, budget, places, payments, media (optional), links, weather
- High-quality PDF with styling
- Trip-specific colors and branding
- QR code linking to trip
- Multiple export formats (PDF, Excel, CSV)
- Custom branding for Pro
- Multi-language support

**Developer Details**:
```typescript
// src/services/pdfExportService.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateTripPDF(tripId: string): Promise<Blob> {
  // 1. Aggregate trip data
  const tripData = await aggregateTripData(tripId);

  // 2. Render trip summary component
  const element = renderTripSummary(tripData);

  // 3. Convert to canvas
  const canvas = await html2canvas(element);

  // 4. Generate PDF
  const pdf = new jsPDF();
  pdf.addImage(canvas, 'PNG', 0, 0, 210, 297);

  return pdf.output('blob');
}
```

**Pain Points Solved**:
- Shareable trip summary
- Offline trip reference
- Professional presentation for Pro trips

**Edge Cases**:
- Large trips (pagination)
- Media-heavy trips (file size)
- Missing data (graceful fallback)
- Export while trip is in progress

---

### 14. Subscription & Monetization

#### Consumer Subscription Tiers

**Free Tier**:
- Unlimited consumer trips
- 5 AI queries per trip
- 500 MB storage
- Basic features
- No PDF export
- No calendar sync

**Explorer Tier ($9.99/month or $99/year)**:
- Unlimited consumer trips
- 10 AI queries per trip
- 50 GB storage
- Trip categories
- Budget tracking
- Priority support

**Frequent Chraveler Tier ($19.99/month or $199/year)**:
- Unlimited consumer trips
- Unlimited AI queries
- 50 GB+ storage
- Calendar sync
- PDF export
- 1 Pro trip per month (50 seats)
- Early access to features

**Developer Details**:
```typescript
// src/types/subscription.ts
type ConsumerTier = 'free' | 'explorer' | 'frequent_chraveler';

interface SubscriptionLimits {
  ai_queries_per_trip: number | 'unlimited';
  storage_gb: number;
  pdf_export: boolean;
  calendar_sync: boolean;
  pro_trips_per_month: number;
  pro_trip_seat_limit: number;
}

const TIER_LIMITS: Record<ConsumerTier, SubscriptionLimits> = {
  free: {
    ai_queries_per_trip: 5,
    storage_gb: 0.5,
    pdf_export: false,
    calendar_sync: false,
    pro_trips_per_month: 0,
    pro_trip_seat_limit: 0
  },
  // ... other tiers
};
```

---

#### Pro/Enterprise Subscription Tiers

**Starter Pro ($49/month)**:
- 25 team members
- Basic features
- Email support

**Growth Pro ($199/month)**:
- 100 team members
- Advanced features
- Integrations (Saber, Concur)
- Phone support

**Enterprise Pro ($499/month)**:
- 500 team members
- SSO/MFA
- Custom branding
- White-label options
- 24/5 support
- Advanced analytics

**Enterprise Plus (Custom pricing)**:
- Unlimited team members
- On-premise deployment
- Custom feature development
- 24/7 dedicated support
- Custom SLA
- Quarterly business reviews

**Pain Points Solved**:
- Flexible pricing for all org sizes
- Clear feature differentiation
- Enterprise-grade security and support

---

#### Advertising Platform
**What It Does**: Allow businesses to advertise to Chravel users.

**Key Features**:
- Advertiser registration and verification
- Campaign creation with targeting
- **Targeting Options**: Age, gender, interests, location, trip type
- Campaign scheduling (start/end dates)
- Budget management (daily/total)
- **Analytics**: Impressions, clicks, conversions, CTR, conversion rate, cost per click
- Native ad format
- Destination-relevant placement

**Developer Details**:
```typescript
// src/types/advertiser.ts
interface Campaign {
  id: string;
  advertiser_id: string;
  name: string;
  description: string;
  discount_details?: string;
  images: string[];
  destinations: string[]; // targeted locations
  start_date: string;
  end_date: string;
  budget_daily: number;
  budget_total: number;
  targeting: CampaignTargeting;
  status: 'draft' | 'active' | 'paused' | 'ended';
  analytics: CampaignAnalytics;
}

interface CampaignTargeting {
  age_min?: number;
  age_max?: number;
  gender?: 'male' | 'female' | 'all';
  interests: string[];
  locations: string[];
  trip_types: string[];
}

interface CampaignAnalytics {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number; // click-through rate
  conversion_rate: number;
  cost_per_click: number;
}
```

**Pain Points Solved**:
- Additional revenue stream
- Relevant ads for users
- Advertiser dashboard and analytics

**Edge Cases**:
- Budget exhaustion (pause campaign)
- Zero impressions (targeting too narrow)
- Ad fatigue (frequency capping)
- Advertiser account suspension

---

## Technical Architecture

### Frontend Stack

**Core Technologies**:
- **Framework**: React 18.3.1
- **Language**: TypeScript 5.5.3
- **Build Tool**: Vite 5.4.1
- **Styling**: Tailwind CSS 3.4.11
- **UI Library**: shadcn/ui (Radix UI components)

**Key Libraries**:
- **State Management**: Zustand 5.0.6 + React Context
- **Routing**: React Router DOM 6.26.2
- **Forms**: React Hook Form 7.53.0 + Zod validation
- **Charts**: Recharts 2.12.7
- **Maps**: React Leaflet 4.2.1 + Google Maps JS API
- **Chat**: Stream Chat React 13.2.1
- **Modals/UI**: Radix UI + custom components
- **Notifications**: Sonner 2.0.6
- **Icons**: Lucide React 0.462.0
- **Date/Time**: date-fns 3.6.0
- **PDF**: jsPDF + html2canvas
- **Excel**: XLSX 0.18.5

**Architecture Patterns**:
- Component-based architecture
- Feature-based directory structure
- Service layer for business logic
- Custom hooks for reusable logic
- Context API for cross-cutting concerns
- Zustand stores for global state

---

### Backend & Database

**Backend**:
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (JWT-based)
- **Real-time**: Supabase Realtime (WebSocket)
- **Storage**: Supabase Storage (S3-compatible)
- **Serverless Functions**: Supabase Edge Functions (Deno)

**Key Database Tables**:
```
trips
trip_members
trip_messages (via Stream Chat)
trip_events / calendar_events
trip_tasks
payment_splits
user_payment_methods
trip_participants (pro)
broadcast_messages
trip_channels
channel_messages
files / media
user_profiles
organizations
organization_members
loyalty_programs
compliance_rules
medical_logs
```

**Row-Level Security (RLS)**:
- Users only access trips they're members of
- Role-based access for Pro features
- Privacy mode enforcement at database level
- Audit logging for sensitive operations

---

### Third-Party Integrations

**APIs & Services**:
- **Google Maps**: Location services, place search, directions
- **Stripe**: Subscription payment processing
- **Claude AI** (Anthropic): Concierge assistance
- **Stream Chat**: Real-time messaging infrastructure
- **Runware**: AI image generation
- **OpenAI**: Fallback for chat completions

**Mobile (Capacitor)**:
- **Camera**: Photo capture
- **Geolocation**: GPS tracking
- **Local Notifications**: Native alerts
- **Push Notifications**: APNs (iOS) / FCM (Android)
- **Filesystem**: Local storage
- **Share**: Native share sheet
- **StatusBar**: Status bar customization

---

### Development & DevOps

**Development**:
- **Linting**: ESLint 9.9.0
- **Testing**: Vitest + Testing Library
- **Type Checking**: TypeScript compiler
- **Git**: GitHub for version control

**Build & Deployment**:
- Vite production builds
- Environment variable management
- CI/CD via GitHub Actions (inferred)
- Capacitor builds for iOS/Android native apps

---

## Edge Cases & Special Handling

### Rate Limiting & Quotas
- **Concierge Queries**: Tier-based limits enforced
- **API Rate Limits**: Supabase standard limits
- **File Uploads**: Size limits vary by tier and media type
- **Message Length**: Max characters enforced per trip type
- **Storage Limits**: Enforced per tier with warnings

### Data Validation
- **Trip Dates**: End date must be after start date (validation)
- **Payment Amounts**: Must be positive, currency validation
- **Email Validation**: RFC-compliant email format
- **File Types**: Whitelist of supported MIME types
- **Payment Methods**: Format validation per type (e.g., Venmo usernames)

### Conflict Resolution
- **Concurrent Edits**: Supabase Realtime handles last-write-wins
- **Message Ordering**: Timestamp-based with server time
- **Payment Reconciliation**: Version tracking with full audit log
- **Role Changes**: Take effect immediately with notifications

### Privacy & Compliance
- **High Privacy Mode**: Disables all AI features, enables E2EE
- **GDPR Compliance**: Data export, right-to-be-forgotten, consent tracking
- **HIPAA Ready**: Available in Enterprise+ with BAA
- **Data Residency**: Configurable for Enterprise+
- **Audit Logs**: Immutable logs for sensitive operations

---

## Security & Compliance

### Security Features

**Authentication**:
- Supabase Auth with JWT tokens
- OAuth (Google, Apple)
- Password security (hashed with bcrypt)
- Session management with refresh tokens
- MFA support (TOTP)
- SSO integration (Enterprise)

**Authorization**:
- Row-Level Security (RLS) on all tables
- Role-Based Access Control (RBAC)
- Trip-level permissions
- Feature-level access control
- API key management for Enterprise

**Data Protection**:
- **Standard Mode**: Server-side encryption (AES-256)
- **High Privacy Mode**: End-to-End encryption (E2EE)
- HTTPS enforced
- Secure headers (CSP, HSTS)
- CSRF protection
- XSS prevention

### Compliance Certifications

- **SOC 2 Type II**: Security, availability, confidentiality
- **GDPR**: EU data protection compliance
- **HIPAA Ready**: Enterprise+ with BAA
- **CCPA**: California privacy compliance
- **Data Retention**: Configurable policies

---

## Monetization & Pricing

### Revenue Streams

1. **Consumer Subscriptions**: Free, Explorer ($9.99/mo), Frequent Chraveler ($19.99/mo)
2. **Pro/Enterprise Subscriptions**: Starter ($49/mo), Growth ($199/mo), Enterprise ($499/mo), Enterprise+ (Custom)
3. **Advertising Platform**: Campaign-based revenue from advertisers
4. **API Access**: Enterprise tier includes API, potential for API-only pricing
5. **Custom Development**: Enterprise+ includes custom features
6. **White-Label**: Additional revenue from branded deployments

### Pricing Strategy

**Freemium Model**:
- Free tier attracts users
- Explorer tier for engaged hobbyists
- Frequent Chraveler for power users
- Natural upgrade path as usage grows

**Enterprise Model**:
- Seat-based pricing scales with organization
- Clear tier differentiation by features and support
- High-touch sales for Enterprise+
- Custom pricing for unique requirements

**Advertising Model**:
- CPC (cost-per-click) or CPM (cost-per-thousand-impressions)
- Self-serve platform for small advertisers
- Managed campaigns for large brands
- Native ad format maintains user experience

---

## Competitive Advantages

### 1. Unified Platform
**Unlike competitors** (TripIt, Travefy, Google Trips, Splitwise), Chravel consolidates:
- Trip planning
- Collaboration
- Communication
- Financial management
- Media storage
- AI assistance
- Professional event management

**Advantage**: Users don't need 10 apps, everything in one place.

---

### 2. AI-Powered Intelligence
**Unlike competitors**, Chravel's AI Concierge:
- Has full trip context (messages, calendar, preferences)
- Provides personalized recommendations
- Extracts events from documents automatically
- Answers questions in natural language

**Advantage**: Intelligent assistance that understands your specific trip.

---

### 3. Professional & Enterprise Features
**Unlike consumer-focused competitors**, Chravel serves:
- Professional events (conferences, festivals)
- Tours (music, sports, content)
- Enterprise organizations

**Advantage**: Addressable market extends beyond consumer travel.

---

### 4. Real-Time Collaboration
**Unlike email/spreadsheet-based planning**, Chravel offers:
- Real-time chat with Stream Chat
- Live calendar updates
- Collaborative expense tracking
- Instant notifications

**Advantage**: True group planning, not asynchronous coordination.

---

### 5. Financial Clarity
**Unlike Venmo/Splitwise alone**, Chravel:
- Integrates expenses with trip context
- Optimizes settlement paths
- Stores receipts and payment methods
- Tracks per-diem and settlements (Pro)

**Advantage**: Complete financial picture within trip context.

---

### 6. Privacy Options
**Unlike competitors with one-size-fits-all privacy**, Chravel offers:
- Standard mode (convenience)
- High Privacy mode (E2EE, zero-knowledge)
- User choice per trip

**Advantage**: Balances convenience and privacy based on user needs.

---

### 7. Mobile-First with Native Apps
**Unlike web-only competitors**, Chravel:
- Progressive Web App (PWA)
- Native iOS and Android apps (Capacitor)
- Offline support
- Native features (camera, notifications)

**Advantage**: Works everywhere, online or offline.

---

## Future Roadmap

### Near-Term Enhancements (Next 6 Months)

1. **Enhanced AI Features**:
   - Voice-based AI Concierge
   - Proactive trip suggestions
   - AI-powered photo organization and albums
   - Sentiment analysis on group discussions

2. **Booking Integrations**:
   - Direct flight booking (via Saber, Amadeus)
   - Hotel booking (via Booking.com, Expedia API)
   - Activity booking (via Viator, GetYourGuide)
   - Rental car booking (via Turo, traditional agencies)

3. **Advanced Collaboration**:
   - Real-time collaborative itinerary editing (Google Docs-style)
   - Video chat integration for planning sessions
   - Polls and voting for group decisions
   - Anonymous feedback for group dynamics

4. **Financial Enhancements**:
   - Multi-currency expense tracking with auto-conversion
   - Tax categorization for business travel
   - Integration with accounting software (QuickBooks, Xero)
   - Travel insurance upsell

---

### Mid-Term Enhancements (6-12 Months)

1. **Global Expansion**:
   - Multi-language interface (Spanish, French, German, Japanese, Chinese)
   - Region-specific recommendations
   - Currency support for 150+ currencies
   - International payment methods

2. **Advanced Analytics**:
   - Trip analytics dashboard (spending trends, popular destinations)
   - Organization-wide analytics for Enterprise
   - Predictive analytics (budget forecasting)
   - Custom reporting

3. **Marketplace**:
   - Third-party integrations marketplace
   - Community-built templates
   - Travel agent partnerships
   - Influencer collaboration tools

4. **Social Features**:
   - Public trip profiles (opt-in)
   - Follow other travelers
   - Trip inspiration feed
   - Community recommendations

---

### Long-Term Vision (12+ Months)

1. **Platform Expansion**:
   - Desktop apps (Electron)
   - Tablet-optimized experience
   - Wear OS / watchOS apps
   - Smart home integrations (Alexa, Google Home)

2. **AI Evolution**:
   - Fully autonomous trip planning agent
   - Natural language itinerary creation ("Plan me a week in Paris")
   - Predictive assistance (proactive suggestions)
   - Multi-agent collaboration (AI agents for flights, hotels, activities)

3. **Enterprise Platform**:
   - Full API ecosystem for custom integrations
   - White-label SaaS platform for travel agencies
   - Embedded Chravel for corporate intranets
   - Travel management company (TMC) features

4. **Sustainability Features**:
   - Carbon footprint tracking per trip
   - Sustainable travel recommendations
   - Offset program integration
   - Green travel badges and gamification

---

## Conclusion

**Chravel is the most comprehensive trip management and collaboration platform on the market**, addressing pain points across consumer, professional, and enterprise travel segments.

### For Investors

**Market Opportunity**:
- $1.4T global travel market
- 817M international travelers annually
- $11.4B travel management software market
- Untapped professional/enterprise segment

**Competitive Moats**:
- Unified platform (10+ apps replaced)
- AI-powered intelligence with trip context
- Professional/Enterprise features (unique)
- Real-time collaboration infrastructure
- Privacy-first architecture with E2EE option

**Revenue Model**:
- Subscription-based (predictable, recurring)
- Multi-tier monetization (consumer → enterprise)
- Advertising platform (additional revenue stream)
- High unit economics (low marginal cost per user)

**Growth Potential**:
- Viral growth through group trips (network effects)
- Freemium → paid conversion
- Land-and-expand in Enterprise
- Global expansion (multi-language)

---

### For Developers

**Technical Excellence**:
- Modern tech stack (React, TypeScript, Supabase)
- Scalable architecture (serverless, edge functions)
- Real-time infrastructure (WebSocket, Stream Chat)
- Mobile-first with native app support
- Comprehensive test coverage

**Code Quality**:
- Type-safe with TypeScript throughout
- Feature-based component organization
- Service layer abstraction
- Custom hooks for reusability
- Clear separation of concerns

**Security & Compliance**:
- Row-Level Security (RLS) enforced
- End-to-End encryption option
- SOC 2, GDPR, HIPAA-ready
- Audit logging for sensitive operations
- SSO/MFA for Enterprise

**Developer Experience**:
- Clear code organization
- Comprehensive type definitions
- Reusable components and services
- Well-documented codebase
- Extensible architecture for future features

---

**Chravel solves real travel pain points with a comprehensive, AI-powered, collaborative platform that scales from individual travelers to enterprise organizations. The codebase is production-ready, secure, and positioned for rapid growth.**

---

*Document Version: 1.0*
*Last Updated: October 28, 2025*
*Total Features Documented: 100+*
*Code Files Analyzed: 200+*
