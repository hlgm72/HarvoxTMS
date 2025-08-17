-- Fix loads table RLS policies to resolve CORS and 500 errors

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Loads comprehensive policy" ON loads;
DROP POLICY IF EXISTS "loads_company_access" ON loads;

-- Create a single, clear RLS policy for loads
CREATE POLICY "loads_unified_access" ON loads
FOR ALL
USING (
  -- User must be authenticated and not anonymous
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    -- User is the driver assigned to the load
    driver_user_id = auth.uid() OR
    -- User created the load (for unassigned loads)
    (driver_user_id IS NULL AND created_by = auth.uid()) OR
    -- User has access through company membership
    (
      payment_period_id IN (
        SELECT cpp.id
        FROM company_payment_periods cpp
        JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
        WHERE ucr.user_id = auth.uid() 
        AND ucr.is_active = true
      )
    )
  )
)
WITH CHECK (
  -- User must be authenticated and not anonymous
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    -- For new loads, user must have admin privileges in the company
    payment_period_id IN (
      SELECT cpp.id
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid() 
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
    ) AND
    -- Period must not be locked
    NOT EXISTS (
      SELECT 1 FROM company_payment_periods cpp
      WHERE cpp.id = payment_period_id AND cpp.is_locked = true
    )
  )
);