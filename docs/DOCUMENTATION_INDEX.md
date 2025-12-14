# Documentation Index

**Last Updated:** 2025-01-31

This index provides a comprehensive guide to all Chravel documentation.

---

## 📚 Getting Started

- **[DEVELOPER_HANDBOOK.md](../DEVELOPER_HANDBOOK.md)** - Complete developer onboarding guide
- **[ENVIRONMENT_SETUP_GUIDE.md](../ENVIRONMENT_SETUP_GUIDE.md)** - Local development setup
- **[CODEBASE_MAP.md](../CODEBASE_MAP.md)** - High-level codebase overview

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
- **[DEPLOYMENT_READINESS_ASSESSMENT.md](../DEPLOYMENT_READINESS_ASSESSMENT.md)** - Pre-deployment assessment

### iOS Deployment
- **[IOS_DEPLOY_QUICKSTART.md](../IOS_DEPLOY_QUICKSTART.md)** - Quick iOS deployment guide
- **[IOS_APP_STORE_GUIDE.md](../IOS_APP_STORE_GUIDE.md)** - App Store submission guide
- **[IOS_TESTING_CHECKLIST.md](../IOS_TESTING_CHECKLIST.md)** - iOS testing checklist

### Android Deployment
- **[ANDROID_DEPLOY_QUICKSTART.md](../ANDROID_DEPLOY_QUICKSTART.md)** - Quick Android deployment guide
- **[ANDROID_CAPACITOR_GUIDE.md](../ANDROID_CAPACITOR_GUIDE.md)** - Comprehensive Android guide

### Mobile Development
- **[CAPACITOR_NATIVE_GUIDE.md](../CAPACITOR_NATIVE_GUIDE.md)** - Capacitor native features
- **[MOBILE_IMPLEMENTATION.md](../MOBILE_IMPLEMENTATION.md)** - Mobile implementation details
- **[MOBILE_READINESS.md](../MOBILE_READINESS.md)** - Mobile readiness checklist

---

## 🧩 Component Library

---
Storybook was previously scaffolded but is currently not part of the active toolchain.

---

## 🔧 Development Guides

### Feature-Specific
- **[AI_CONCIERGE_SETUP.md](AI_CONCIERGE_SETUP.md)** - AI concierge implementation
- **[GOOGLE_MAPS_PLACES_INTEGRATION.md](../GOOGLE_MAPS_PLACES_INTEGRATION.md)** - Maps integration
- **[AUTHENTICATION_SETUP.md](../AUTHENTICATION_SETUP.md)** - Auth setup guide

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
- **[ENTERPRISE_TEAM_TAB_FEATURES.md](../ENTERPRISE_TEAM_TAB_FEATURES.md)** - Enterprise features

---

## 🔍 Reference

### Quick References
- **[SUPABASE_QUICK_REFERENCE.md](SUPABASE_QUICK_REFERENCE.md)** - Supabase commands and patterns
- **[CODEBASE_MAP.md](../CODEBASE_MAP.md)** - Codebase structure

### Handoff Documents
- **[HANDOFF.md](HANDOFF.md)** - General handoff guide
- **[DEVELOPER_HANDOFF_AVATAR.md](../DEVELOPER_HANDOFF_AVATAR.md)** - Avatar feature handoff

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
