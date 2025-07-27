-- Fix profiles RLS policy to use user_id column instead of id
-- The table has both id and user_id, but the code queries by user_id

-- Drop the current policy
DROP POLICY IF EXISTS "Profiles simple access" ON public.profiles;

-- Create the correct policy using user_id
CREATE POLICY "Profiles user access" ON public.profiles
FOR ALL 
TO authenticated
USING (
  -- Users can only see their own profile using user_id column
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  -- Users can only modify their own profile using user_id column
  user_id = (SELECT auth.uid())
);