-- Fix RLS policies for user_onboarding_progress to prevent anonymous access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own onboarding progress" ON public.user_onboarding_progress;
DROP POLICY IF EXISTS "Users can update their own onboarding progress" ON public.user_onboarding_progress;

-- Create new secure policies that prevent anonymous access
CREATE POLICY "Authenticated users can view their own onboarding progress"
ON public.user_onboarding_progress
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  auth.uid() = user_id AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "Authenticated users can update their own onboarding progress"
ON public.user_onboarding_progress
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  auth.uid() = user_id AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = user_id AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "Authenticated users can insert their own onboarding progress"
ON public.user_onboarding_progress
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = user_id AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
);