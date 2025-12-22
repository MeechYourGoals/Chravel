# Documentation Index

**Last Updated:** 2025-01-31

This index provides a comprehensive guide to all Chravel documentation.

---

## 📚 Getting Started

- **[DEVELOPER_HANDBOOK.md](_archive/root/DEVELOPER_HANDBOOK.md)** - Complete developer onboarding guide (historical)
- **[ENVIRONMENT_SETUP_GUIDE.md](ACTIVE/ENVIRONMENT_SETUP_GUIDE.md)** - Local development setup
- **[CODEBASE_MAP.md](_archive/root/CODEBASE_MAP.md)** - High-level codebase overview (historical)

---

## 🏗️ Architecture & Design

### Architecture Decision Records (ADRs)
- **[001-capacitor-over-react-native.md](ADRs/001-capacitor-over-react-native.md)** - Why we chose Capacitor
- **[002-supabase-over-firebase.md](ADRs/002-supabase-over-firebase.md)** - Why we chose Supabase
- **[003-google-maps-over-mapbox.md](ADRs/003-google-maps-over-mapbox.md)** - Why we chose Google Maps
- **[004-tanstack-query-over-redux.md](ADRs/004-tanstack-query-over-redux.md)** - State management decisions

### Architecture Documentation
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture overview
- **[SINGLE_MAP_ARCHITECTURE.md](SINGLE_MAP_ARCHITECTURE.md)** - Map component architecture
- **[SECURITY.md](SECURITY.md)** - Security practices and policies

---

## 📖 API Documentation

- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete API reference for edge functions
- **[API_INTEGRATION_STATUS.md](API_INTEGRATION_STATUS.md)** - External API integration status

**Generate API docs:**
```bash
npm run docs:generate
```

---

## 🗄️ Database

- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Database schema documentation
- **[SUPABASE_QUICK_REFERENCE.md](SUPABASE_QUICK_REFERENCE.md)** - Supabase quick reference
- **[SUPABASE_MIGRATION_GUIDE.md](SUPABASE_MIGRATION_GUIDE.md)** - Database migration guide
- **[SUPABASE_BACKUP_STRATEGY.md](SUPABASE_BACKUP_STRATEGY.md)** - Backup and recovery

---

## 🚀 Deployment

### Production Deployment
- **[PRODUCTION_DEPLOYMENT_CHECKLIST.md](PRODUCTION_DEPLOYMENT_CHECKLIST.md)** - Complete deployment checklist
- **[DEPLOYMENT_READINESS_ASSESSMENT.md](_archive/root/DEPLOYMENT_READINESS_ASSESSMENT.md)** - Pre-deployment assessment (historical)

### iOS Deployment
- **[IOS_DEPLOY_QUICKSTART.md](_archive/root/IOS_DEPLOY_QUICKSTART.md)** - Quick iOS deployment guide (historical)
- **[IOS_APP_STORE_GUIDE.md](_archive/root/IOS_APP_STORE_GUIDE.md)** - App Store submission guide (historical)
- **[IOS_TESTING_CHECKLIST.md](_archive/root/IOS_TESTING_CHECKLIST.md)** - iOS testing checklist (historical)

### Android Deployment
- **[ANDROID_DEPLOY_QUICKSTART.md](_archive/root/ANDROID_DEPLOY_QUICKSTART.md)** - Quick Android deployment guide (historical)
- **[ANDROID_CAPACITOR_GUIDE.md](_archive/root/ANDROID_CAPACITOR_GUIDE.md)** - Comprehensive Android guide (historical)

### Mobile Development
- **[CAPACITOR_NATIVE_GUIDE.md](_archive/root/CAPACITOR_NATIVE_GUIDE.md)** - Capacitor native features (historical)
- **[MOBILE_IMPLEMENTATION.md](_archive/root/MOBILE_IMPLEMENTATION.md)** - Mobile implementation details (historical)
- **[MOBILE_READINESS.md](_archive/root/MOBILE_READINESS.md)** - Mobile readiness checklist (historical)

---

## 🧩 Component Library

- **[STORYBOOK_SETUP.md](STORYBOOK_SETUP.md)** - Storybook setup and usage guide

**Run Storybook:**
```bash
npm run storybook
```

---

## 🔧 Development Guides

### Feature-Specific
- **[AI_CONCIERGE_SETUP.md](AI_CONCIERGE_SETUP.md)** - AI concierge implementation
- **[GOOGLE_MAPS_PLACES_INTEGRATION.md](_archive/root/GOOGLE_MAPS_PLACES_INTEGRATION.md)** - Maps integration (historical)
- **[AUTHENTICATION_SETUP.md](ACTIVE/AUTHENTICATION_SETUP.md)** - Auth setup guide

### Testing
- **[CI_CD_SETUP.md](CI_CD_SETUP.md)** - CI/CD pipeline setup
- **[IOS_TESTING_CHECKLIST.md](../IOS_TESTING_CHECKLIST.md)** - iOS testing

---

## 📋 Feature Documentation

### Core Features
- **[PRD.md](PRD.md)** - Product Requirements Document
- **[CHANNELS.md](CHANNELS.md)** - Chat channels feature
- **[MEDIA_SHARE_INTEGRATION.md](MEDIA_SHARE_INTEGRATION.md)** - Media sharing

### Enterprise Features
- **[ADVERTISER_SYSTEM.md](ADVERTISER_SYSTEM.md)** - Advertiser system
- **[ENTERPRISE_TEAM_TAB_FEATURES.md](_archive/root/ENTERPRISE_TEAM_TAB_FEATURES.md)** - Enterprise features (historical)

---

## 🔍 Reference

### Quick References
- **[SUPABASE_QUICK_REFERENCE.md](SUPABASE_QUICK_REFERENCE.md)** - Supabase commands and patterns
- **[CODEBASE_MAP.md](_archive/root/CODEBASE_MAP.md)** - Codebase structure (historical)

### Handoff Documents
- **[HANDOFF.md](HANDOFF.md)** - General handoff guide
- **[DEVELOPER_HANDOFF_AVATAR.md](_archive/root/DEVELOPER_HANDOFF_AVATAR.md)** - Avatar feature handoff (historical)

---

## 📝 Documentation Standards

### Writing Documentation
- Use Markdown format
- Include code examples
- Add "Last Updated" date
- Link to related docs

### API Documentation
- Use JSDoc comments
- Generate with TypeDoc
- Include request/response examples
- Document error cases

### Component Documentation
- Use Storybook stories
- Document props and usage
- Include accessibility notes
- Show different states

---

## 🆕 Recently Added

- ✅ **API_DOCUMENTATION.md** - Complete API reference
- ✅ **DATABASE_SCHEMA.md** - Database schema docs
- ✅ **ANDROID_DEPLOY_QUICKSTART.md** - Android deployment guide
- ✅ **PRODUCTION_DEPLOYMENT_CHECKLIST.md** - Deployment checklist
- ✅ **ADRs/** - Architecture Decision Records
- ✅ **STORYBOOK_SETUP.md** - Storybook guide
- ✅ **API_INTEGRATION_STATUS.md** - API status tracking

---

## 🔗 External Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Google Maps Platform](https://developers.google.com/maps/documentation)
- [TanStack Query](https://tanstack.com/query/latest)
- [Vite Documentation](https://vitejs.dev/)

---

## 📞 Support

For questions or updates to documentation:
- Create an issue in the repository
- Contact the engineering team
- Update docs via pull request

---

**Maintained By:** Engineering Team
