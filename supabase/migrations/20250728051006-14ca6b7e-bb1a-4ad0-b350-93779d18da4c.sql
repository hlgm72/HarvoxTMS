-- Fix performance issues by optimizing auth function calls in RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Strictly authenticated users can view invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Strictly authenticated company owners can create invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Strictly authenticated users can update invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Strictly authenticated company owners can delete invitations" ON public.user_invitations;

-- Create optimized policies with SELECT-wrapped auth functions for better performance

-- SELECT policy - optimized with SELECT-wrapped auth functions
CREATE POLICY "Optimized authenticated users can view invitations" 
ON public.user_invitations 
FOR SELECT 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
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

-- INSERT policy - optimized with SELECT-wrapped auth functions
CREATE POLICY "Optimized company owners can create invitations" 
ON public.user_invitations 
FOR INSERT 
TO authenticated
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- UPDATE policy - optimized with SELECT-wrapped auth functions
CREATE POLICY "Optimized authenticated users can update invitations" 
ON public.user_invitations 
FOR UPDATE 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
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

-- DELETE policy - optimized with SELECT-wrapped auth functions
CREATE POLICY "Optimized company owners can delete invitations" 
ON public.user_invitations 
FOR DELETE 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);