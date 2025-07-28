-- Disable anonymous access at the table level and create ultra-restrictive policies

-- First, ensure RLS is enabled
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start completely fresh
DROP POLICY IF EXISTS "Helper optimized select invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Helper optimized insert invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Helper optimized update invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Helper optimized delete invitations" ON public.user_invitations;

-- Create a SINGLE consolidated policy that handles all operations with explicit role checks
-- This approach should eliminate the anonymous access warnings

CREATE POLICY "user_invitations_authenticated_access_only"
ON public.user_invitations
FOR ALL
TO authenticated
USING (
  -- Explicit check: user must be authenticated, non-anonymous, and have valid access
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, true) = false AND
  (
    -- FOR SELECT and UPDATE: Company owners can see/modify invitations for their company
    (
      EXISTS (
        SELECT 1 FROM public.user_company_roles ucr
        WHERE ucr.user_id = auth.uid()
        AND ucr.company_id = user_invitations.company_id
        AND ucr.role = 'company_owner'
        AND ucr.is_active = true
      )
    )
    OR
    -- FOR SELECT and UPDATE: Users can see/accept invitations sent to their email
    (
      email = auth.email() AND 
      (accepted_at IS NULL OR accepted_at IS NOT NULL) -- Allow both pending and accepted
    )
  )
)
WITH CHECK (
  -- FOR INSERT and UPDATE: Only authenticated company owners can create/modify
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, true) = false AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);