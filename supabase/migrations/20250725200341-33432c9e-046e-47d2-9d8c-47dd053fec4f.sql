-- Drop the overlapping policy
DROP POLICY IF EXISTS "Company managers can manage fuel card providers" ON public.fuel_card_providers;

-- Create separate policies for each action to avoid overlap

-- Policy for INSERT - Only company managers and superadmins
CREATE POLICY "Company managers can insert fuel card providers" 
ON public.fuel_card_providers 
FOR INSERT 
WITH CHECK (
  (select auth.role()) = 'service_role' OR 
  ((select auth.role()) = 'authenticated' AND EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ))
);

-- Policy for UPDATE - Only company managers and superadmins  
CREATE POLICY "Company managers can update fuel card providers" 
ON public.fuel_card_providers 
FOR UPDATE 
USING (
  (select auth.role()) = 'service_role' OR 
  ((select auth.role()) = 'authenticated' AND EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ))
)
WITH CHECK (
  (select auth.role()) = 'service_role' OR 
  ((select auth.role()) = 'authenticated' AND EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ))
);

-- Policy for DELETE - Only company managers and superadmins
CREATE POLICY "Company managers can delete fuel card providers" 
ON public.fuel_card_providers 
FOR DELETE 
USING (
  (select auth.role()) = 'service_role' OR 
  ((select auth.role()) = 'authenticated' AND EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ))
);