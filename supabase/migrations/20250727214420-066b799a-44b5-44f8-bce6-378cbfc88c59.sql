-- Fix only the profiles select policy to use the correct column reference
-- The profile already exists, we just need to fix the policy

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Update the INSERT and UPDATE policies too to use user_id consistently
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- Create corrected policies using user_id
CREATE POLICY "profiles_select_policy" 
ON public.profiles 
FOR SELECT 
USING (
  ((SELECT auth.role()) = 'service_role') OR
  (auth.uid() IS NOT NULL AND 
   (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
   auth.uid() = user_id)
);

CREATE POLICY "profiles_insert_policy" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  ((SELECT auth.role()) = 'service_role') OR
  (auth.uid() IS NOT NULL AND 
   (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
   auth.uid() = user_id)
);

CREATE POLICY "profiles_update_policy" 
ON public.profiles 
FOR UPDATE 
USING (
  ((SELECT auth.role()) = 'service_role') OR
  (auth.uid() IS NOT NULL AND 
   (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
   auth.uid() = user_id)
)
WITH CHECK (
  ((SELECT auth.role()) = 'service_role') OR
  (auth.uid() IS NOT NULL AND 
   (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
   auth.uid() = user_id)
);