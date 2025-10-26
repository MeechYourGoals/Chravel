# 🎯 Agency Access Checklist - Quick Reference

**Use this as your day-1 checklist. For comprehensive details, see `AGENCY_HANDOFF.md`**

---

## 🔑 CRITICAL: Access Required Immediately

### 1. Code & Deployment
- [ ] **GitHub Repository:** https://github.com/MeechYourGoals/Chravel (Admin access)
- [ ] **Lovable Platform:** https://lovable.dev/projects/20feaa04-0946-4c68-a68d-0eb88cc1b9c4 (Collaborator)

### 2. Backend Infrastructure
- [ ] **Supabase Dashboard:** https://app.supabase.com/project/jmjiyekmxwsxkfnqwyaa
  - Project ID: `jmjiyekmxwsxkfnqwyaa`
  - Need: Admin access + service role key
  
### 3. API Keys (Frontend - Public)
- [ ] `VITE_SUPABASE_URL` - Already in code: `https://jmjiyekmxwsxkfnqwyaa.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY` - Already in code (hardcoded)
- [ ] `VITE_STREAM_API_KEY` - Request from client
- [ ] `VITE_GOOGLE_MAPS_API_KEY` - Request from client
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` - Request from client

### 4. API Keys (Backend - Secret)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Request from client
- [ ] `STREAM_API_SECRET` - Request from client
- [ ] `OPENAI_API_KEY` - Request from client
- [ ] `LOVABLE_API_KEY` - Request from client (for Gemini)
- [ ] `STRIPE_SECRET_KEY` - Request from client
- [ ] `STRIPE_WEBHOOK_SECRET` - Request from client
- [ ] `RESEND_API_KEY` - Request from client
- [ ] `FCM_SERVER_KEY` - Request from client

---

## 📱 WEEK 2: Mobile App Access

### iOS
- [ ] **Apple Developer Account:** developer.apple.com
  - Team access for Bundle ID: `com.chravel.app`
- [ ] **App Store Connect:** appstoreconnect.apple.com
  - Admin or Developer role

### Android  
- [ ] **Google Play Console:** play.google.com/console
  - Admin access for package: `com.chravel.app`

### Firebase (Push Notifications)
- [ ] **Firebase Console:** console.firebase.google.com
  - Project access for FCM
  - Need: `GoogleService-Info.plist` (iOS) and `google-services.json` (Android)

---

## 📊 OPTIONAL: Analytics & Monitoring

### To Be Created by Agency (Share Access with Client)
- [ ] **Google Analytics 4** - Create property → Share admin access
- [ ] **Mixpanel** - Create project → Share admin access  
- [ ] **Sentry** - Create project → Share admin access

---

## 🛠️ Day 1 Setup Commands

```bash
# Clone repo
git clone https://github.com/MeechYourGoals/Chravel.git
cd Chravel

# Install dependencies
npm install

# Create environment file
cp .env.production.example .env.production

# Edit .env.production with API keys from client
nano .env.production

# Start development server
npm run dev
# Should open at http://localhost:8080

# Link Supabase CLI (after getting access)
npx supabase link --project-ref jmjiyekmxwsxkfnqwyaa
```

---

## ✅ Verification Tests

Once you have all access, verify each service:

```bash
# 1. App loads
npm run dev
→ Visit http://localhost:8080
→ Should see login page

# 2. Supabase connection
→ Try to sign up with email
→ Should create user

# 3. Stream Chat works
→ Create a test trip
→ Should see chat interface

# 4. Google Maps works
→ Add a destination to trip
→ Should see map and autocomplete

# 5. Stripe works
→ Navigate to billing/upgrade
→ Should see checkout page

# 6. AI Concierge works
→ Open AI assistant in a trip
→ Should get contextual responses

# 7. Mobile builds
npm run ios:build    # Should complete without errors
npm run ios:open     # Should open Xcode project
```

---

## 📞 Request from Client

**Email template to send client:**

> Subject: Chravel Development - Required API Access
> 
> Hi [Client Name],
> 
> We've successfully cloned the Chravel repository and are ready to begin development. To get started, we need access to the following services:
> 
> **Critical (Week 1):**
> 1. Supabase project admin access (jmjiyekmxwsxkfnqwyaa)
> 2. Stream Chat API key + secret
> 3. Google Maps API key
> 4. Stripe keys (publishable + secret + webhook secret)
> 5. OpenAI API key
> 6. Lovable/Gemini API key
> 7. Resend email API key
> 8. Firebase FCM server key
> 
> **Mobile (Week 2):**
> 9. Apple Developer account access (for com.chravel.app)
> 10. Google Play Console access (for com.chravel.app)
> 
> We've prepared a comprehensive handoff document (AGENCY_HANDOFF.md) that details everything we need. Please let us know the best way to securely share these credentials (1Password, Bitwarden, encrypted email, etc.).
> 
> Best regards,
> [Your Team]

---

## 🚨 Security Reminders

1. **NEVER commit `.env` files to Git** - They're in .gitignore for a reason
2. **Use 1Password/Bitwarden** for storing credentials securely
3. **Restrict API keys** to production domains before launch:
   - Google Maps: Restrict to `chravel.app`, `*.chravel.app`
   - Supabase: Already restricted via RLS
   - Stripe: Use test mode until production launch
4. **Rotate keys immediately** if accidentally exposed

---

## 📖 Key Documentation Files

Once access is set up, read these in order:

1. **AGENCY_HANDOFF.md** - Comprehensive handoff document (THIS IS THE BIG ONE)
2. **SUPABASE_LOCAL_SETUP.md** - Supabase development guide
3. **DEVELOPER_HANDBOOK.md** - Development standards
4. **ENVIRONMENT_SETUP_GUIDE.md** - Detailed API setup
5. **IOS_APP_STORE_GUIDE.md** - iOS deployment
6. **README.md** - Project overview

---

## 🎯 Success Criteria

**You're ready to start development when:**
- ✅ Local dev server runs without errors
- ✅ You can create a user account
- ✅ You can create a test trip
- ✅ Chat messages send and receive
- ✅ Maps load and locations autocomplete
- ✅ You can access Supabase Dashboard
- ✅ You understand the codebase structure

**Estimated time to full setup:** 1-3 days (depending on how quickly client provides credentials)

---

## 💬 Questions?

If you get stuck or have questions:
1. Check `AGENCY_HANDOFF.md` - It's 600+ lines of detailed documentation
2. Review inline code comments
3. Check existing documentation in `/docs` folder
4. Ask client for clarification

Good luck! You've got this. 🚀
