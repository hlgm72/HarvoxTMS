-- Fix RLS performance issue for companies table
-- Drop the existing policy with performance issues
DROP POLICY IF EXISTS "SuperAdmin complete access" ON public.companies;

-- Create the corrected policy with proper auth function calls
CREATE POLICY "SuperAdmin complete access" 
ON public.companies 
FOR ALL 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated'::text) AND (
    (EXISTS ( 
      SELECT 1
      FROM user_company_roles ucr
      WHERE ((ucr.user_id = (SELECT auth.uid())) AND (ucr.role = 'superadmin'::user_role) AND (ucr.is_active = true))
    )) OR (
      id IN ( 
        SELECT ucr.company_id
        FROM user_company_roles ucr
        WHERE ((ucr.user_id = (SELECT auth.uid())) AND (ucr.is_active = true))
      )
    )
  )
)
WITH CHECK (
  ((SELECT auth.role()) = 'authenticated'::text) AND (
    (EXISTS ( 
      SELECT 1
      FROM user_company_roles ucr
      WHERE ((ucr.user_id = (SELECT auth.uid())) AND (ucr.role = 'superadmin'::user_role) AND (ucr.is_active = true))
    )) OR (
      EXISTS ( 
        SELECT 1
        FROM user_company_roles ucr
        WHERE ((ucr.user_id = (SELECT auth.uid())) AND (ucr.company_id = companies.id) AND (ucr.role = 'company_owner'::user_role) AND (ucr.is_active = true))
      )
    )
  )
);