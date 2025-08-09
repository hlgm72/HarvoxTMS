-- Fix RLS performance issues and remove duplicate policies for user_onboarding_progress

-- Drop all existing policies to start clean
DROP POLICY IF EXISTS "Authenticated users can view their own onboarding progress" ON public.user_onboarding_progress;
DROP POLICY IF EXISTS "Authenticated users can update their own onboarding progress" ON public.user_onboarding_progress;
DROP POLICY IF EXISTS "Authenticated users can insert their own onboarding progress" ON public.user_onboarding_progress;
DROP POLICY IF EXISTS "Users can view their own onboarding progress" ON public.user_onboarding_progress;
DROP POLICY IF EXISTS "Users can update their own onboarding progress" ON public.user_onboarding_progress;
DROP POLICY IF EXISTS "Users can insert their own onboarding progress" ON public.user_onboarding_progress;

-- Create optimized policies using (select auth.function()) for better performance
CREATE POLICY "user_onboarding_progress_select_policy"
ON public.user_onboarding_progress
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT auth.uid()) = user_id AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "user_onboarding_progress_update_policy"
ON public.user_onboarding_progress
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT auth.uid()) = user_id AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT auth.uid()) = user_id AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "user_onboarding_progress_insert_policy"
ON public.user_onboarding_progress
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT auth.uid()) = user_id AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
);