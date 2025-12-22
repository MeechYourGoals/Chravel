# iOS Developer Needed: SwiftUI App Build from Detailed Specifications

## Project Overview

We have a **production React/TypeScript web app** (Chravel - group travel platform) and need a **native iOS version** built. We've already completed extensive architectural planning and have ~3,000 lines of Swift code scaffolding ready.

**This is NOT starting from scratch** - significant planning work is done.

## What's Already Complete

✅ **Complete feature specifications** - Every screen, component, and flow documented  
✅ **SwiftUI code scaffolding** - Views, ViewModels, Models, Services (~16 files)  
✅ **Data models** - All Swift structs with Codable conformance  
✅ **Navigation architecture** - NavigationStack with typed destinations  
✅ **Design system** - Colors, typography, spacing, components defined  
✅ **Supabase integration patterns** - Auth, database, storage, realtime  
✅ **Project structure** - Folder organization, file naming, architecture  

## What You'll Build

A native iOS app with:
- **Authentication** (Email, Apple Sign-In, Google)
- **Trip management** (Create, view, edit trips)
- **Real-time chat** (Group messaging with attachments)
- **Expense tracking** (Split bills, settlements)
- **Maps integration** (Google Places API)
- **AI chat** (Calls our existing Supabase Edge Functions)
- **Push notifications**

## Tech Stack

- **SwiftUI** (iOS 17+)
- **Swift 5.10**
- **@Observable** macro (not Combine)
- **Supabase Swift SDK** (auth, database, storage, realtime, functions)
- **Google Maps SDK** for iOS
- **MVVM architecture**

## Your Responsibilities

1. **Create Xcode project** from our specifications
2. **Integrate our Swift code** - fix compilation errors, wire up properly
3. **Connect real Supabase SDK** - replace stub implementations
4. **Implement Google Maps** integration
5. **Test thoroughly** on simulator and devices
6. **Set up push notifications** with APNs
7. **Prepare for App Store** - help with submission process

## Deliverables

- [ ] Working Xcode project that builds
- [ ] All screens functional and connected to backend
- [ ] Real-time features working (chat, notifications)
- [ ] TestFlight build for internal testing
- [ ] App Store submission ready

## Timeline & Budget

- **Estimated effort**: 40-80 hours
- **Timeline**: 2-4 weeks
- **Budget**: $2,000 - $5,000 (negotiable based on experience)

## Requirements

- **3+ years** SwiftUI experience
- **Experience with Supabase** or similar BaaS (Firebase, AWS Amplify)
- **Published apps** on App Store
- **Strong communication** - we want updates and questions, not silence

## To Apply

Please include:
1. Links to **2-3 iOS apps** you've built (App Store or TestFlight)
2. Your experience with **Supabase Swift SDK** specifically
3. **Estimated hours** and timeline
4. Any questions about the project

## About the Project

Chravel is a group travel platform - think "Slack meets TripIt for friend groups." The web app is live and functional. We want a native iOS experience that feels premium, not a web wrapper.

Our existing backend (Supabase) handles:
- Authentication
- PostgreSQL database with RLS
- Real-time subscriptions
- Edge Functions for AI/payments
- File storage

The iOS app connects to this same backend.

---

**We're looking for a developer who can take well-documented specs and turn them into a polished, functional app - not someone who needs to architect from scratch.**
