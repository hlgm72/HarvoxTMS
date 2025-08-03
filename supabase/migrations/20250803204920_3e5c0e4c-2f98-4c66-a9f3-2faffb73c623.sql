-- Fix overlapping policies for user_company_roles
-- The issue is that user_company_roles_all_policy (FOR ALL) includes SELECT operations,
-- which overlaps with user_company_roles_select_policy (FOR SELECT)
-- Solution: Create specific policies for each operation without overlap

-- Drop existing policies
DROP POLICY IF EXISTS "user_company_roles_select_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_all_policy" ON public.user_company_roles;

-- Create non-overlapping policies
-- Policy 1: SELECT only - allows users to view roles in their companies
CREATE POLICY "user_company_roles_select_policy" 
ON public.user_company_roles 
FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND company_id = ANY(get_user_company_ids_safe((SELECT auth.uid())))
);

-- Policy 2: INSERT only - allows admins to create roles
CREATE POLICY "user_company_roles_insert_policy" 
ON public.user_company_roles 
FOR INSERT 
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    is_user_admin_in_company_safe((SELECT auth.uid()), company_id) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);

-- Policy 3: UPDATE only - allows admins to update roles
CREATE POLICY "user_company_roles_update_policy" 
ON public.user_company_roles 
FOR UPDATE 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    is_user_admin_in_company_safe((SELECT auth.uid()), company_id) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    is_user_admin_in_company_safe((SELECT auth.uid()), company_id) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);

-- Policy 4: DELETE only - allows admins to delete roles
CREATE POLICY "user_company_roles_delete_policy" 
ON public.user_company_roles 
FOR DELETE 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    is_user_admin_in_company_safe((SELECT auth.uid()), company_id) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);