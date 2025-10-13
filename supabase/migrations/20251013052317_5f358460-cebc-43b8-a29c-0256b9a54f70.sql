-- Drop existing SELECT policy for loads
DROP POLICY IF EXISTS "loads_select_company_access" ON public.loads;

-- Create new SELECT policy that includes loads without driver assigned
CREATE POLICY "loads_select_company_access" 
ON public.loads 
FOR SELECT 
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false)
  AND (
    -- User is the driver
    driver_user_id = auth.uid()
    OR
    -- Driver is in the same company
    driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid()
        AND ucr2.is_active = true
      )
      AND ucr.is_active = true
    )
    OR
    -- Load has no driver but was created by someone in the same company
    (
      driver_user_id IS NULL
      AND created_by IN (
        SELECT ucr.user_id
        FROM user_company_roles ucr
        WHERE ucr.company_id IN (
          SELECT ucr2.company_id
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = auth.uid()
          AND ucr2.is_active = true
        )
        AND ucr.is_active = true
      )
    )
    OR
    -- User created the load
    created_by = auth.uid()
  )
);