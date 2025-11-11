# ADR 002: Supabase over Firebase

**Status:** Accepted  
**Date:** 2024-09-15  
**Deciders:** Engineering Team

## Context

Chravel needed a backend-as-a-service (BaaS) solution for:
- Authentication
- Database (PostgreSQL)
- Real-time subscriptions
- File storage
- Edge functions (serverless)

We evaluated Firebase and Supabase.

## Decision

We chose **Supabase** over Firebase.

## Rationale

### Advantages of Supabase

1. **PostgreSQL Database**
   - Full SQL database (vs Firebase's NoSQL)
   - Better for complex relational data (trips, members, messages, expenses)
   - ACID transactions
   - Advanced queries (joins, aggregations)
   - Better tooling (pgAdmin, DBeaver, etc.)

2. **Row Level Security (RLS)**
   - Database-level security policies
   - More granular than Firebase Security Rules
   - Easier to reason about permissions
   - Better for multi-tenant applications

3. **Real-time Subscriptions**
   - Built on PostgreSQL replication
   - More reliable than Firebase Realtime Database
   - Better for complex queries
   - Lower latency for relational data

4. **Open Source**
   - Can self-host if needed
   - No vendor lock-in
   - Community-driven development
   - Transparent pricing

5. **Developer Experience**
   - SQL is more familiar than Firestore queries
   - Better TypeScript support (generated types)
   - REST API + GraphQL support
   - Better debugging tools

6. **Cost**
   - More predictable pricing
   - Free tier more generous for development
   - Better value for relational data workloads

### Trade-offs

**Disadvantages:**

1. **Ecosystem**
   - Smaller ecosystem than Firebase
   - Fewer third-party integrations
   - **Mitigation:** Most integrations available via REST APIs

2. **Mobile SDKs**
   - Native mobile SDKs less mature than Firebase
   - **Mitigation:** Use JavaScript SDK via Capacitor WebView (works well)

3. **Analytics**
   - No built-in analytics like Firebase Analytics
   - **Mitigation:** Use third-party analytics (Google Analytics, Mixpanel)

4. **ML/AI Features**
   - No built-in ML features like Firebase ML
   - **Mitigation:** Use external AI APIs (Gemini, OpenAI) via Edge Functions

## Alternatives Considered

### Firebase
- **Pros:** Larger ecosystem, better mobile SDKs, built-in analytics
- **Cons:** NoSQL limitations, vendor lock-in, less flexible
- **Rejected because:** PostgreSQL better fits our data model, RLS is superior

### Self-Hosted PostgreSQL + Auth
- **Pros:** Full control, no vendor lock-in
- **Cons:** High maintenance burden, scaling complexity
- **Rejected because:** Team size too small, need to focus on product

### AWS Amplify
- **Pros:** Powerful, integrates with AWS ecosystem
- **Cons:** Complex setup, steeper learning curve, higher cost
- **Rejected because:** Overkill for our needs, Supabase simpler

## Consequences

### Positive
- ✅ Better data modeling with PostgreSQL
- ✅ More flexible queries and relationships
- ✅ Better security with RLS
- ✅ Lower costs for our use case
- ✅ Easier to migrate if needed (open source)

### Negative
- ⚠️ Smaller ecosystem (fewer pre-built integrations)
- ⚠️ Mobile SDKs less mature (but JavaScript SDK works fine)

### Neutral
- Real-time subscriptions work well for our chat/messaging needs
- Edge Functions provide serverless capabilities similar to Cloud Functions

## Implementation Notes

- Use Supabase JavaScript SDK (`@supabase/supabase-js`)
- Generate TypeScript types from database schema
- Use RLS policies for all tables
- Edge Functions for serverless backend logic
- Supabase Storage for file uploads

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase vs Firebase Comparison](https://supabase.com/docs/guides/getting-started/comparing-supabase-vs-firebase)

---

**Last Updated:** 2025-01-31
