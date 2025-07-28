-- Drop the existing policy
DROP POLICY IF EXISTS "user_invitations_authenticated_access_only" ON public.user_invitations;

-- Create the FINAL policy using ONLY optimized helper functions - zero direct auth calls
CREATE POLICY "user_invitations_authenticated_access_only"
ON public.user_invitations
FOR ALL
TO authenticated
USING (
  -- Use only the existing optimized helper function
  public.is_authenticated_non_anon() AND
  (
    -- FOR SELECT and UPDATE: Company owners can see/modify invitations for their company
    (
      EXISTS (
        SELECT 1 FROM public.user_company_roles ucr
        WHERE ucr.user_id = public.get_current_user_id()
        AND ucr.company_id = user_invitations.company_id
        AND ucr.role = 'company_owner'
        AND ucr.is_active = true
      )
    )
    OR
    -- FOR SELECT and UPDATE: Users can see/accept invitations sent to their email
    (
      email = public.get_current_user_email() AND 
      (accepted_at IS NULL OR accepted_at IS NOT NULL)
    )
  )
)
WITH CHECK (
  -- FOR INSERT and UPDATE: Only authenticated company owners can create/modify
  public.is_authenticated_non_anon() AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = public.get_current_user_id()
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);