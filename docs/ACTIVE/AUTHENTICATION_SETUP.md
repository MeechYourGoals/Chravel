# Authentication Setup Guide

This guide provides instructions for setting up all authentication methods in Chravel.

## Overview

Chravel supports multiple authentication methods:
- ✅ Email/Password (Built-in, no configuration needed after migration)
- ⚙️ Google OAuth (Requires configuration)
- ⚙️ Apple OAuth (Requires configuration)
- ⚙️ Phone OTP (Requires SMS provider configuration)

## Database Migration

**IMPORTANT**: Before testing authentication, ensure the latest migration has been applied.

### Apply the Auth Fix Migration

```bash
# Connect to your Supabase project and run:
npx supabase migration up
```

Or apply it manually in the Supabase Dashboard SQL Editor:
- Navigate to SQL Editor in your Supabase Dashboard
- Copy and paste the contents of `/supabase/migrations/20251022000000_fix_auth_flow.sql`
- Run the migration

This migration ensures:
- The `profiles` table has all necessary columns
- The `handle_new_user()` trigger is properly set up to create profiles automatically
- RLS policies are correctly configured
- Error handling is in place for auth failures

## Email/Password Authentication

Email/password authentication should work out of the box after applying the migration.

### Configure Email Confirmation (Optional but Recommended)

1. Go to Supabase Dashboard → Authentication → Settings
2. Under "Auth Providers" → Email
3. **Option A: Disable Email Confirmation (For Development)**
   - Set "Enable email confirmations" to OFF
   - Users can sign in immediately after signup

4. **Option B: Enable Email Confirmation (For Production)**
   - Set "Enable email confirmations" to ON
   - Configure SMTP settings (or use Supabase's default mailer)
   - Users must confirm their email before signing in

### Testing Email/Password Auth

1. Go to your app's sign-up page
2. Enter first name, last name, email, and password
3. Click "Create Account"
4. If email confirmation is disabled, you should be signed in immediately
5. If email confirmation is enabled, check your email for a confirmation link

## Google OAuth Setup

To enable Google sign-in, you need to configure the Google OAuth provider in Supabase.

### Prerequisites

1. A Google Cloud Console account
2. Access to your Supabase project dashboard

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Select "Web application"
   - Add authorized redirect URIs:
     ```
     https://jmjiyekmxwsxkfnqwyaa.supabase.co/auth/v1/callback
     ```
     (Replace with your Supabase project URL)
   - Copy the Client ID and Client Secret

### Step 2: Configure Supabase

1. Go to your Supabase Dashboard → Authentication → Providers
2. Find "Google" in the list
3. Enable Google provider
4. Enter your Google Client ID and Client Secret
5. Click "Save"

### Testing Google OAuth

1. Go to your app's sign-in page
2. Click "Google" button
3. You should be redirected to Google's login page
4. After successful login, you'll be redirected back to your app

## Apple OAuth Setup

To enable Apple sign-in, you need to configure the Apple OAuth provider in Supabase.

### Prerequisites

1. An Apple Developer account ($99/year)
2. Access to your Supabase project dashboard

### Step 1: Create Apple Sign In Credentials

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Create a new App ID:
   - Click "Identifiers" → "+" button
   - Select "App IDs" → Continue
   - Enter description and Bundle ID
   - Enable "Sign In with Apple"
   - Click "Continue" → "Register"

4. Create a Services ID:
   - Click "Identifiers" → "+" button
   - Select "Services IDs" → Continue
   - Enter identifier and description
   - Enable "Sign In with Apple"
   - Configure:
     - Primary App ID: Select the App ID you created
     - Web Domain: Your app's domain (e.g., `yourdomain.com`)
     - Return URLs:
       ```
       https://jmjiyekmxwsxkfnqwyaa.supabase.co/auth/v1/callback
       ```
   - Click "Save" → "Continue" → "Register"

5. Create a Key:
   - Click "Keys" → "+" button
   - Enter a name (e.g., "Sign in with Apple Key")
   - Enable "Sign In with Apple"
   - Configure: Select your Primary App ID
   - Click "Continue" → "Register"
   - Download the key file (.p8) - **SAVE THIS SECURELY**
   - Note the Key ID

### Step 2: Configure Supabase

1. Go to your Supabase Dashboard → Authentication → Providers
2. Find "Apple" in the list
3. Enable Apple provider
4. Enter the following:
   - **Services ID**: Your Services ID from Step 1
   - **Private Key**: Contents of the .p8 file
   - **Key ID**: The Key ID from Step 1
   - **Team ID**: Your Apple Developer Team ID
5. Click "Save"

### Testing Apple OAuth

1. Go to your app's sign-in page
2. Click "Apple" button
3. You should be redirected to Apple's login page
4. After successful login, you'll be redirected back to your app

## Phone OTP Setup

To enable phone OTP authentication, you need to configure an SMS provider in Supabase.

### Supported SMS Providers

Supabase supports the following SMS providers:
- Twilio (Recommended)
- MessageBird
- Vonage
- Textlocal

### Step 1: Set Up Twilio (Recommended)

1. Create a [Twilio account](https://www.twilio.com/try-twilio)
2. Get your Twilio credentials:
   - Account SID
   - Auth Token
3. Get a Twilio phone number:
   - Go to Phone Numbers → Buy a Number
   - Choose a number that supports SMS
4. Note your credentials for the next step

### Step 2: Configure Supabase

1. Go to your Supabase Dashboard → Authentication → Providers
2. Find "Phone" in the list
3. Enable Phone provider
4. Select "Twilio" as the SMS provider
5. Enter your Twilio credentials:
   - **Account SID**: Your Twilio Account SID
   - **Auth Token**: Your Twilio Auth Token
   - **Phone Number**: Your Twilio phone number (e.g., +1234567890)
6. Configure OTP settings:
   - **OTP Expiry**: How long the OTP is valid (default: 60 seconds)
   - **OTP Length**: Length of the OTP code (default: 6 digits)
7. Click "Save"

### Testing Phone OTP

1. Go to your app's sign-in page
2. Click the "Phone" tab
3. Enter your phone number with country code (e.g., +1234567890)
4. Click "Send OTP"
5. You should receive an SMS with a verification code
6. Enter the code to sign in

## Troubleshooting

### Email/Password Issues

**Problem**: "Invalid email or password" error when credentials are correct

**Solution**:
1. Ensure the migration has been applied
2. Check if email confirmation is required but user hasn't confirmed
3. Try resetting the password

**Problem**: "Please confirm your email address" error

**Solution**:
1. Check your email inbox (and spam folder) for the confirmation link
2. Or disable email confirmation in Supabase Dashboard for testing

### Google OAuth Issues

**Problem**: "Google sign-in is not configured" error

**Solution**:
1. Verify Google OAuth is enabled in Supabase Dashboard
2. Check that Client ID and Client Secret are correct
3. Verify redirect URI matches exactly

**Problem**: Redirect fails after Google login

**Solution**:
1. Check that authorized redirect URIs are configured in Google Console
2. Verify the Supabase callback URL is correct

### Apple OAuth Issues

**Problem**: "Apple sign-in is not configured" error

**Solution**:
1. Verify Apple OAuth is enabled in Supabase Dashboard
2. Check that all credentials (Services ID, Key, Key ID, Team ID) are correct
3. Verify return URLs match exactly

**Problem**: Apple login fails with "invalid_client" error

**Solution**:
1. Check that the private key (.p8 file) is correctly pasted
2. Verify the Key ID and Team ID are correct
3. Ensure the Services ID is correctly configured in Apple Developer Portal

### Phone OTP Issues

**Problem**: "Phone authentication is not configured" error

**Solution**:
1. Verify Phone provider is enabled in Supabase Dashboard
2. Check that Twilio credentials are correct
3. Verify Twilio phone number is SMS-capable

**Problem**: No SMS received

**Solution**:
1. Check phone number format includes country code (e.g., +1234567890)
2. Verify Twilio account has sufficient credits
3. Check Twilio logs for delivery status
4. Ensure phone number is not blocked by carrier

### General Issues

**Problem**: Authentication works but user data is missing

**Solution**:
1. Ensure the `handle_new_user()` trigger is properly set up
2. Check Supabase logs for trigger errors
3. Verify RLS policies allow profile creation

**Problem**: Browser console shows CORS errors

**Solution**:
1. This is normal for OAuth redirects
2. The authentication will still work if configured correctly

## Testing Checklist

Before deploying to production, test all authentication methods:

- [ ] Email/Password sign up
- [ ] Email/Password sign in
- [ ] Email confirmation (if enabled)
- [ ] Password reset (if implemented)
- [ ] Google OAuth sign in
- [ ] Apple OAuth sign in
- [ ] Phone OTP sign in
- [ ] Sign out
- [ ] Profile creation after sign up
- [ ] Session persistence (refresh page after login)

## Support

If you're still experiencing issues after following this guide:

1. Check the browser console for detailed error messages
2. Check Supabase logs in Dashboard → Logs
3. Review the authentication code in `/src/hooks/useAuth.tsx`
4. Verify all migrations have been applied

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Apple OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Phone Auth Setup](https://supabase.com/docs/guides/auth/phone-login)
