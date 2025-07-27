-- Fix RLS policies to require authentication instead of allowing anonymous access
-- These warnings indicate policies are too permissive

-- 1. Fix user_company_roles policy to require authentication
DROP POLICY IF EXISTS "User company roles basic access" ON public.user_company_roles;

CREATE POLICY "User company roles authenticated access" ON public.user_company_roles
FOR ALL 
TO authenticated  -- Changed from 'public' to 'authenticated'
USING (
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  user_id = (SELECT auth.uid())
);

-- 2. Fix user_invitations to require authentication for most operations
DROP POLICY IF EXISTS "User invitations unified access" ON public.user_invitations;

CREATE POLICY "Users can view their invitations" ON public.user_invitations
FOR SELECT
TO authenticated
USING (
  invited_email = (SELECT auth.email())
  OR 
  invited_by = (SELECT auth.uid())
);

CREATE POLICY "Users can accept their invitations" ON public.user_invitations
FOR UPDATE
TO authenticated
USING (invited_email = (SELECT auth.email()))
WITH CHECK (invited_email = (SELECT auth.email()));

-- 3. For geographic data tables, allow read-only access to authenticated users only
-- These are reference data but should still require authentication

DROP POLICY IF EXISTS "US cities unified access policy" ON public.us_cities;
DROP POLICY IF EXISTS "US counties unified access policy" ON public.us_counties;  
DROP POLICY IF EXISTS "US states unified access policy" ON public.us_states;
DROP POLICY IF EXISTS "ZIP codes unified access policy" ON public.zip_codes;
DROP POLICY IF EXISTS "ZIP city links unified access policy" ON public.zip_city_links;

-- Create authenticated-only policies for geographic data
CREATE POLICY "Authenticated users can read US cities" ON public.us_cities
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read US counties" ON public.us_counties
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read US states" ON public.us_states
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read ZIP codes" ON public.zip_codes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read ZIP city links" ON public.zip_city_links
FOR SELECT
TO authenticated
USING (true);