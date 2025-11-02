-- Fix authentication flow by ensuring all necessary components are in place
-- This migration is idempotent and can be run multiple times

-- Ensure profiles table has all necessary columns
DO $$
BEGIN
  -- Add show_email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'show_email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN show_email BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add show_phone column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'show_phone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN show_phone BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Drop existing function and trigger to recreate them
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  profile_exists BOOLEAN;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = NEW.id
  ) INTO profile_exists;

  -- Only create profile if it doesn't exist
  IF NOT profile_exists THEN
    INSERT INTO public.profiles (
      user_id,
      display_name,
      first_name,
      last_name,
      email,
      phone,
      show_email,
      show_phone
    )
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'display_name',
        SPLIT_PART(NEW.email, '@', 1),
        'User'
      ),
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.email,
      NEW.phone,
      false,
      false
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS is enabled on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profile information" ON public.profiles;

-- Create comprehensive RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view other profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create or update user_preferences table if needed
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'en',
  notifications_email BOOLEAN NOT NULL DEFAULT true,
  notifications_push BOOLEAN NOT NULL DEFAULT false,
  notifications_sms BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;

-- Create RLS policies for user preferences
CREATE POLICY "Users can manage their own preferences"
ON public.user_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add comment to document this fix
COMMENT ON FUNCTION public.handle_new_user IS 'Creates a profile for newly signed up users. Updated to be idempotent and handle errors gracefully.';
