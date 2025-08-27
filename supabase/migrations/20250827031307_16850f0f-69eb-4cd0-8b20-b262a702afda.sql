-- Fix RLS performance issue: wrap auth functions with select to prevent re-evaluation per row
-- This addresses the auth_rls_initplan linter warning

-- Drop the existing policy
DROP POLICY IF EXISTS "exclusions_company_access" ON public.recurring_expense_exclusions;

-- Recreate the policy with optimized auth function calls
CREATE POLICY "exclusions_company_access" ON public.recurring_expense_exclusions
FOR ALL USING (
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
);