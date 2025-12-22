# Chravel Project Overview

## What is Chravel?

Chravel is an AI-native operating system for collaborative travel, logistics, and event management. It's designed to eliminate the coordination chaos that wastes 23 hours per consumer trip and causes $2.3B annual losses in professional sectors.

## Core Features

### Consumer Features
- **Trip Management**: Create, organize, and collaborate on trips
- **Real-time Chat**: Integrated messaging for trip participants with @mentions and reactions
- **AI Concierge**: Context-aware recommendations powered by AI with web search
- **Shared Itineraries**: Collaborative planning with live updates and conflict detection
- **Media Sharing**: Upload and share photos/videos within trips
- **Expense Tracking**: Split costs and track shared expenses with multi-currency support
- **Task Management**: Create and assign tasks with polls for group decisions
- **Calendar Integration**: Sync with Google Calendar
- **Mobile PWA**: Full mobile support as a Progressive Web App

### Professional Features (Chravel Pro)
- **Team Management**: Role-based structures for tours and events
- **Multi-city Logistics**: Complex itinerary planning across locations
- **Equipment Tracking**: Manage gear and requirements
- **Budget Approvals**: Financial workflows and reporting
- **Compliance Tools**: Contract and permit management

### Enterprise & Events
- **Large-scale Event Management**: Handle 2K-200K attendees
- **Registration Systems**: Ticketing and check-in
- **Sponsor Management**: In-app advertising and analytics
- **Networking Tools**: AI-powered attendee matching

### Advertiser Hub (NEW)
- **Campaign Management**: Create and manage travel recommendation campaigns
- **Audience Targeting**: Demographics, interests, and trip type targeting
- **Performance Analytics**: Real-time metrics and reporting
- **Visual Preview**: See how ads appear as trip cards
- **Image Carousel**: Support for multiple campaign images

## Technical Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS with custom design system
- Mobile-first PWA architecture
- TanStack Query for server state
- Zustand for client state

### Backend
- Supabase (PostgreSQL + Auth + Realtime + Storage)
- Edge Functions for serverless compute
- Row-level security for data isolation
- WebSockets for real-time collaboration

### AI Integration
- OpenAI GPT-4 for recommendations
- Perplexity for web search
- Context-aware responses based on trip data

## Key Differentiators

1. **Universal Application**: Works for any trip type (consumer, pro, enterprise)
2. **Privacy-First**: No phone number sharing required
3. **AI-Native**: AI integrated into core workflows, not bolted on
4. **Reusable Infrastructure**: 65% cost reduction for event apps
5. **Network Effects**: More users = more value for everyone

## Monetization Model

### Freemium Tiers
- **Free**: Up to 10 participants per trip
- **Pro**: $X/month for unlimited features
- **Enterprise**: Custom pricing for organizations

### Revenue Streams
- Subscription revenue (SaaS)
- Affiliate commissions on bookings
- Advertiser campaigns (Travel Recs)
- Transaction fees on payments
- White-label solutions for events

## Market Opportunity

- **TAM**: $1.6T across travel, logistics, and events
- **Consumer Travel**: $369B+
- **Professional Logistics**: $560B+
- **Event Management**: $750B

## Recent Updates

### Advertiser Hub (December 2024)
- Complete advertiser dashboard for campaign management
- 5-step campaign creation wizard
- Real-time analytics and performance tracking
- Secure image upload with CDN delivery
- Targeting system for demographics and interests
- Live preview showing ads as trip cards

## Documentation

- [Advertiser System Guide](/docs/ADVERTISER_SYSTEM.md)
- [AI Concierge Setup](/docs/AI_CONCIERGE_SETUP.md)
- [Mobile Implementation](/MOBILE_IMPLEMENTATION.md)
- [Security Overview](/docs/SECURITY.md)
- [iOS Deployment Guide](/IOS_DEPLOY_QUICKSTART.md)

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Supabase project and environment variables
4. Run development server: `npm run dev`
5. Access advertiser dashboard at `/advertiser`

For detailed setup instructions, see [SETUP_INSTRUCTIONS.md](/SETUP_INSTRUCTIONS.md)