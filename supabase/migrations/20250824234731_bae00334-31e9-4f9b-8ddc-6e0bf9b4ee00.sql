-- Continue fixing security issues
-- Fix the anonymous access warning and secure other sensitive tables

-- =======================
-- 3. Fix profiles table to prevent anonymous access
-- =======================
DROP POLICY IF EXISTS "Users can view profiles in their company only" ON public.profiles;

CREATE POLICY "Users can view profiles in their company only" 
ON public.profiles 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) AND
  (
    -- Users can see their own profile
    user_id = auth.uid() OR
    -- Users can see profiles of people in their company
    EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = profiles.user_id
      AND ucr2.user_id = auth.uid()
      AND ucr1.is_active = true
      AND ucr2.is_active = true
    )
  )
);

-- Add missing policies for profiles table
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) AND
  user_id = auth.uid()
);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) AND
  user_id = auth.uid()
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) AND
  user_id = auth.uid()
);