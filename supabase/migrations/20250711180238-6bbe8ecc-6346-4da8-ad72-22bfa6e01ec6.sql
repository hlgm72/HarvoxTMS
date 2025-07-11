-- Fix user_invitations table - properly drop ALL existing policies
-- The previous migration missed some policies

-- Drop ALL existing policies on user_invitations table
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON public.user_invitations;
DROP POLICY IF EXISTS "Company admins can manage invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Service role can manage invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can view their company invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Company owners can view their company invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Superadmins can manage invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "User invitations comprehensive access" ON public.user_invitations;

-- Create single comprehensive policy for user_invitations
CREATE POLICY "User invitations complete access" ON public.user_invitations
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Superadmin has full access
  (auth.role() = 'authenticated' AND is_superadmin(auth.uid()))
  OR
  -- Authenticated users can view invitations sent to them or from their company
  (auth.role() = 'authenticated' AND (
    -- Invitations sent to their email
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    -- Invitations from their company (for company admins)
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.is_active = true 
      AND ucr.role IN ('company_owner', 'senior_dispatcher')
    )
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Superadmin has full access
  (auth.role() = 'authenticated' AND is_superadmin(auth.uid()))
  OR
  -- Company admins can manage invitations for their company
  (auth.role() = 'authenticated' AND company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true 
    AND ucr.role IN ('company_owner', 'senior_dispatcher')
  ))
);

-- Log the correction
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_user_invitations_policy_correction', jsonb_build_object(
  'timestamp', now(),
  'description', 'Fixed user_invitations table by properly removing all duplicate policies',
  'issue', 'Previous migration did not drop all existing policies',
  'solution', 'Explicitly dropped all policies and created single comprehensive one'
));