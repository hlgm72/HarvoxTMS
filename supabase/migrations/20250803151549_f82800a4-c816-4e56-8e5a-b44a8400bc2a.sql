-- Fix RLS performance issues
-- Problem 1: Optimize auth function calls in RLS policies
-- Problem 2: Consolidate multiple permissive policies

-- First, drop the existing policies on loads_archive that are causing issues
DROP POLICY IF EXISTS "Users can view loads_archive for their company" ON public.loads_archive;
DROP POLICY IF EXISTS "Company admins can manage loads_archive" ON public.loads_archive;

-- Create a single optimized policy for loads_archive that covers all access patterns
CREATE POLICY "Optimized loads_archive access policy" 
ON public.loads_archive 
FOR ALL 
USING (
  -- Optimize auth.uid() call by wrapping in SELECT
  (SELECT auth.uid()) IS NOT NULL AND 
  -- Optimize auth.jwt() call by wrapping in SELECT  
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND 
  (
    -- User is the driver assigned to the load
    driver_user_id = (SELECT auth.uid()) OR
    -- User created the load
    created_by = (SELECT auth.uid()) OR
    -- User is in the same company as the driver
    driver_user_id IN (
      SELECT ucr.user_id 
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id 
        FROM user_company_roles ucr2 
        WHERE ucr2.user_id = (SELECT auth.uid()) 
        AND ucr2.is_active = true
      ) 
      AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  -- Same optimized conditions for INSERT/UPDATE
  (SELECT auth.uid()) IS NOT NULL AND 
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND 
  (
    -- Only company admins can modify archived loads
    driver_user_id IN (
      SELECT ucr.user_id 
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id 
        FROM user_company_roles ucr2 
        WHERE ucr2.user_id = (SELECT auth.uid()) 
        AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
        AND ucr2.is_active = true
      ) 
      AND ucr.is_active = true
    )
  )
);