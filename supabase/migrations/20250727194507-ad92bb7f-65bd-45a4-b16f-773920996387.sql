-- Fix RLS policies to require authentication instead of allowing anonymous access
-- Correcting the column names based on actual table structure

-- 1. Fix user_invitations with correct column names
DROP POLICY IF EXISTS "User invitations unified access" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can view their invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can accept their invitations" ON public.user_invitations;

CREATE POLICY "Users can view their invitations" ON public.user_invitations
FOR SELECT
TO authenticated
USING (
  email = (SELECT auth.email())
  OR 
  invited_by = (SELECT auth.uid())
);

CREATE POLICY "Users can accept their invitations" ON public.user_invitations
FOR UPDATE
TO authenticated
USING (email = (SELECT auth.email()))
WITH CHECK (email = (SELECT auth.email()));

-- 2. For geographic data tables, allow read-only access to authenticated users only
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