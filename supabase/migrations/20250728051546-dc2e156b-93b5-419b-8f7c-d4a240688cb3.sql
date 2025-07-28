-- Create a specialized auth validation function to solve both performance and security issues
CREATE OR REPLACE FUNCTION public.is_authenticated_non_anonymous()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND 
    (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE;
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Secure users can view invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Secure company owners can create invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Secure users can update invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Secure company owners can delete invitations" ON public.user_invitations;

-- Create final policies using the specialized function and optimized auth calls

-- SELECT policy - using specialized function to prevent re-evaluation
CREATE POLICY "Performance optimized users can view invitations" 
ON public.user_invitations 
FOR SELECT 
USING (
  public.is_authenticated_non_anonymous() AND
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

-- INSERT policy - using specialized function to prevent re-evaluation
CREATE POLICY "Performance optimized company owners can create invitations" 
ON public.user_invitations 
FOR INSERT 
WITH CHECK (
  public.is_authenticated_non_anonymous() AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- UPDATE policy - using specialized function to prevent re-evaluation
CREATE POLICY "Performance optimized users can update invitations" 
ON public.user_invitations 
FOR UPDATE 
USING (
  public.is_authenticated_non_anonymous() AND
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

-- DELETE policy - using specialized function to prevent re-evaluation
CREATE POLICY "Performance optimized company owners can delete invitations" 
ON public.user_invitations 
FOR DELETE 
USING (
  public.is_authenticated_non_anonymous() AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);