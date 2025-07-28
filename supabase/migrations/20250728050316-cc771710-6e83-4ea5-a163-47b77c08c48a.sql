-- Enable RLS on user_invitations table if not already enabled
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Allow company owners to view invitations for their company
CREATE POLICY "Company owners can view invitations for their company" 
ON public.user_invitations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- Allow company owners to create invitations for their company
CREATE POLICY "Company owners can create invitations for their company" 
ON public.user_invitations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- Allow company owners to update invitations for their company
CREATE POLICY "Company owners can update invitations for their company" 
ON public.user_invitations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- Allow company owners to delete invitations for their company
CREATE POLICY "Company owners can delete invitations for their company" 
ON public.user_invitations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- Allow users to view invitations sent to their email (for accepting invitations)
CREATE POLICY "Users can view invitations sent to their email" 
ON public.user_invitations 
FOR SELECT 
USING (
  email = (SELECT auth.email())
);