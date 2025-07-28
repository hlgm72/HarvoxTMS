-- Drop existing policies for user_invitations
DROP POLICY IF EXISTS "Company owners can view invitations for their company" ON public.user_invitations;
DROP POLICY IF EXISTS "Company owners can create invitations for their company" ON public.user_invitations;
DROP POLICY IF EXISTS "Company owners can update invitations for their company" ON public.user_invitations;
DROP POLICY IF EXISTS "Company owners can delete invitations for their company" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON public.user_invitations;

-- Create secure policies that explicitly exclude anonymous users

-- Allow company owners to view invitations for their company (no anonymous access)
CREATE POLICY "Company owners can view invitations for their company" 
ON public.user_invitations 
FOR SELECT 
USING (
  (auth.role() = 'authenticated') AND
  (auth.uid() IS NOT NULL) AND
  ((auth.jwt()->>'is_anonymous')::boolean IS FALSE) AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- Allow company owners to create invitations for their company (no anonymous access)
CREATE POLICY "Company owners can create invitations for their company" 
ON public.user_invitations 
FOR INSERT 
WITH CHECK (
  (auth.role() = 'authenticated') AND
  (auth.uid() IS NOT NULL) AND
  ((auth.jwt()->>'is_anonymous')::boolean IS FALSE) AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- Allow company owners to update invitations for their company (no anonymous access)
CREATE POLICY "Company owners can update invitations for their company" 
ON public.user_invitations 
FOR UPDATE 
USING (
  (auth.role() = 'authenticated') AND
  (auth.uid() IS NOT NULL) AND
  ((auth.jwt()->>'is_anonymous')::boolean IS FALSE) AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- Allow company owners to delete invitations for their company (no anonymous access)
CREATE POLICY "Company owners can delete invitations for their company" 
ON public.user_invitations 
FOR DELETE 
USING (
  (auth.role() = 'authenticated') AND
  (auth.uid() IS NOT NULL) AND
  ((auth.jwt()->>'is_anonymous')::boolean IS FALSE) AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- Allow authenticated users to view invitations sent to their email (no anonymous access)
CREATE POLICY "Users can view invitations sent to their email" 
ON public.user_invitations 
FOR SELECT 
USING (
  (auth.role() = 'authenticated') AND
  (auth.uid() IS NOT NULL) AND
  ((auth.jwt()->>'is_anonymous')::boolean IS FALSE) AND
  (email = auth.email())
);