-- Create user loyalty programs table for Travel Wallet
CREATE TABLE IF NOT EXISTS public.user_loyalty_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_type TEXT NOT NULL CHECK (program_type IN ('airline', 'hotel', 'rental')),
  company_name TEXT NOT NULL,
  program_name TEXT NOT NULL,
  membership_number TEXT NOT NULL,
  tier TEXT,
  is_preferred BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_loyalty_programs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own loyalty programs
CREATE POLICY "Users can manage their own loyalty programs"
ON public.user_loyalty_programs
FOR ALL
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_user_loyalty_programs_user_id ON public.user_loyalty_programs(user_id);
CREATE INDEX idx_user_loyalty_programs_type ON public.user_loyalty_programs(program_type);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_loyalty_programs_updated_at
  BEFORE UPDATE ON public.user_loyalty_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
