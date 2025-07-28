-- Drop ALL existing policies for user_invitations to start clean
DROP POLICY IF EXISTS "Company owners can view invitations for their company" ON public.user_invitations;
DROP POLICY IF EXISTS "Company owners can create invitations for their company" ON public.user_invitations;
DROP POLICY IF EXISTS "Company owners can update invitations for their company" ON public.user_invitations;
DROP POLICY IF EXISTS "Company owners can delete invitations for their company" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can view their invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can accept their invitations" ON public.user_invitations;

-- Create optimized consolidated policies using performance best practices

-- Consolidated SELECT policy (combines company owners + email recipients)
CREATE POLICY "Consolidated user invitations select policy" 
ON public.user_invitations 
FOR SELECT 
USING (
  is_authenticated_non_anon() AND 
  (
    -- Company owners can see invitations for their company
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = user_invitations.company_id
      AND ucr.role = 'company_owner'
      AND ucr.is_active = true
    )
    OR
    -- Users can see invitations sent to their email
    (email = (SELECT auth.email()))
  )
);

-- INSERT policy (only company owners)
CREATE POLICY "Company owners can create invitations" 
ON public.user_invitations 
FOR INSERT 
WITH CHECK (
  is_authenticated_non_anon() AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- Consolidated UPDATE policy (company owners + email recipients for acceptance)
CREATE POLICY "Consolidated user invitations update policy" 
ON public.user_invitations 
FOR UPDATE 
USING (
  is_authenticated_non_anon() AND 
  (
    -- Company owners can update invitations for their company
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = user_invitations.company_id
      AND ucr.role = 'company_owner'
      AND ucr.is_active = true
    )
    OR
    -- Users can accept invitations sent to their email
    (email = (SELECT auth.email()) AND accepted_at IS NULL)
  )
);

-- DELETE policy (only company owners)
CREATE POLICY "Company owners can delete invitations" 
ON public.user_invitations 
FOR DELETE 
USING (
  is_authenticated_non_anon() AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);