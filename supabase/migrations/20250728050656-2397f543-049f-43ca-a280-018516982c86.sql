-- Fix anonymous access security issue by restricting policies to authenticated role only

-- Drop existing policies
DROP POLICY IF EXISTS "Consolidated user invitations select policy" ON public.user_invitations;
DROP POLICY IF EXISTS "Company owners can create invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Consolidated user invitations update policy" ON public.user_invitations;
DROP POLICY IF EXISTS "Company owners can delete invitations" ON public.user_invitations;

-- Create policies that explicitly target only authenticated users and exclude anonymous access

-- SELECT policy for authenticated users only
CREATE POLICY "Authenticated users can view relevant invitations" 
ON public.user_invitations 
FOR SELECT 
TO authenticated
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

-- INSERT policy for authenticated users only
CREATE POLICY "Authenticated company owners can create invitations" 
ON public.user_invitations 
FOR INSERT 
TO authenticated
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

-- UPDATE policy for authenticated users only
CREATE POLICY "Authenticated users can update relevant invitations" 
ON public.user_invitations 
FOR UPDATE 
TO authenticated
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

-- DELETE policy for authenticated users only
CREATE POLICY "Authenticated company owners can delete invitations" 
ON public.user_invitations 
FOR DELETE 
TO authenticated
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