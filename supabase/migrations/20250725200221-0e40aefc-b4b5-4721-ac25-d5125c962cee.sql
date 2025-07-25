-- Drop existing policies for fuel_card_providers
DROP POLICY IF EXISTS "Authenticated users can view fuel card providers" ON public.fuel_card_providers;
DROP POLICY IF EXISTS "Company managers can manage fuel card providers" ON public.fuel_card_providers;

-- Create optimized policies with proper auth function calls and no overlapping permissions

-- Policy for SELECT: All authenticated users can read fuel card providers
CREATE POLICY "Users can view fuel card providers" 
ON public.fuel_card_providers 
FOR SELECT 
USING ((select auth.role()) = 'authenticated');

-- Policy for INSERT/UPDATE/DELETE: Only company managers and superadmins
CREATE POLICY "Company managers can manage fuel card providers" 
ON public.fuel_card_providers 
FOR ALL 
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