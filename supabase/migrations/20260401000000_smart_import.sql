CREATE TABLE public.gmail_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  refresh_token TEXT,
  access_token_hash TEXT,
  scopes TEXT[],
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, google_user_id)
);

CREATE TYPE public.gmail_import_job_status AS ENUM ('pending', 'running', 'completed', 'failed');

CREATE TABLE public.gmail_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_account_id UUID NOT NULL REFERENCES public.gmail_accounts(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  status public.gmail_import_job_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE public.gmail_import_message_outcome AS ENUM ('parsed', 'skipped', 'error');

CREATE TABLE public.gmail_import_message_logs (
  job_id UUID NOT NULL REFERENCES public.gmail_import_jobs(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  outcome public.gmail_import_message_outcome NOT NULL,
  error_message TEXT,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (job_id, message_id)
);

ALTER TABLE public.gmail_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_import_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gmail accounts" ON public.gmail_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own gmail accounts" ON public.gmail_accounts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own import jobs" ON public.gmail_import_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own import jobs" ON public.gmail_import_jobs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own import message logs" ON public.gmail_import_message_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.gmail_import_jobs WHERE id = public.gmail_import_message_logs.job_id AND user_id = auth.uid()
  )
);
CREATE POLICY "Users can manage their own import message logs" ON public.gmail_import_message_logs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.gmail_import_jobs WHERE id = public.gmail_import_message_logs.job_id AND user_id = auth.uid()
  )
);

-- Note: In a real system, we'd add tables for pending/parsed reservations before they are committed.
-- For now, we'll store them as JSON in a table to allow user review.
CREATE TABLE public.smart_import_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.gmail_import_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  reservation_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  dedupe_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.smart_import_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage candidates" ON public.smart_import_candidates FOR ALL USING (auth.uid() = user_id);
