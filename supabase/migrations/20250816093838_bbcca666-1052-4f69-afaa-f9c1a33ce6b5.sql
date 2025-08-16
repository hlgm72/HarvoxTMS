-- Since equipment_status_summary is a view, we need to secure the underlying table(s)
-- The view appears to be based on company_equipment table

-- Check if company_equipment table already has proper RLS policies
-- Looking at the existing policies, let me ensure they are comprehensive

-- First, let's check what policies exist on company_equipment table
-- Then create a comprehensive policy if needed

-- Create a more restrictive policy for equipment data access
DROP POLICY IF EXISTS "Company equipment access policy" ON public.company_equipment;

-- Create secure policy for company_equipment table (which feeds the view)
CREATE POLICY "company_equipment_secure_select" ON public.company_equipment
FOR SELECT 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

CREATE POLICY "company_equipment_secure_insert" ON public.company_equipment
FOR INSERT 
TO authenticated
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.role IN ('company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role)
    AND ucr.is_active = true
  )
);

CREATE POLICY "company_equipment_secure_update" ON public.company_equipment
FOR UPDATE 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.role IN ('company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role)
    AND ucr.is_active = true
  )
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.role IN ('company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role)
    AND ucr.is_active = true
  )
);

CREATE POLICY "company_equipment_secure_delete" ON public.company_equipment
FOR DELETE 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.role IN ('company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role)
    AND ucr.is_active = true
  )
);