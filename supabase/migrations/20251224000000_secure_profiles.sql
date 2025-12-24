-- Secure Profiles Migration
-- 1. Create private_profiles table for sensitive data
-- 2. Migrate data from profiles
-- 3. Drop sensitive columns from profiles
-- 4. Enable RLS

-- Create private_profiles table
CREATE TABLE IF NOT EXISTS public.private_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.private_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only the user can view/update their own private profile
CREATE POLICY "Users can view own private profile" 
    ON public.private_profiles 
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own private profile" 
    ON public.private_profiles 
    FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own private profile" 
    ON public.private_profiles 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Service role bypasses RLS automatically

-- Migrate data
-- We insert into private_profiles for every existing profile
INSERT INTO public.private_profiles (id, email, phone, stripe_customer_id, stripe_subscription_id, created_at, updated_at)
SELECT 
    id, 
    email, 
    phone, 
    stripe_customer_id, 
    stripe_subscription_id, 
    created_at, 
    updated_at 
FROM public.profiles
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id;

-- Create a trigger to automatically create private_profile when profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile_private() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.private_profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_private
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_private();

-- NOW, the destructive part. 
-- In a real production system, we might delay this or rename columns.
-- For this task, we proceed to drop to enforce security.

ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_subscription_id;

-- Ensure visibility flags exist (they should, but just in case)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT false;
