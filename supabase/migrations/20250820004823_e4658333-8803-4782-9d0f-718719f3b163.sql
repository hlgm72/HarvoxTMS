-- First, drop the dependent view
DROP VIEW IF EXISTS views.profiles CASCADE;

-- Create user_preferences table with moved fields from profiles
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Moved from profiles table
  preferred_language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'America/New_York',
  
  -- New onboarding preferences
  disable_welcome_modal BOOLEAN DEFAULT false,
  disable_onboarding_tour BOOLEAN DEFAULT false,
  disable_setup_wizard BOOLEAN DEFAULT false,
  
  -- Other general preferences
  theme TEXT DEFAULT 'system',
  notifications_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_preferences_updated_at();

-- Migrate existing data from profiles to user_preferences
INSERT INTO public.user_preferences (user_id, preferred_language, timezone)
SELECT 
  user_id,
  COALESCE(preferred_language, 'en'),
  COALESCE(timezone, 'America/New_York')
FROM public.profiles
WHERE user_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  preferred_language = EXCLUDED.preferred_language,
  timezone = EXCLUDED.timezone;

-- Remove the migrated columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN preferred_language CASCADE,
DROP COLUMN timezone CASCADE;