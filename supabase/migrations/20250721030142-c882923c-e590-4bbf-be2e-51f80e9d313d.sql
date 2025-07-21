-- Update the loads RLS policy to allow creating loads without assigned driver
DROP POLICY IF EXISTS "Loads comprehensive policy" ON public.loads;

CREATE POLICY "Loads comprehensive policy" ON public.loads
FOR ALL USING (
  (auth.role() = 'service_role') OR 
  (
    auth.role() = 'authenticated' AND (
      -- Users can see loads they are assigned to drive
      (auth.uid() = driver_user_id) OR
      -- Users can see loads from their company (including unassigned loads)
      (
        NOT is_superadmin(auth.uid()) AND 
        (
          driver_user_id IN (
            SELECT ucr.user_id
            FROM user_company_roles ucr
            WHERE ucr.company_id IN (
              SELECT get_user_company_roles.company_id
              FROM get_user_company_roles(auth.uid())
            ) AND ucr.is_active = true
          ) OR
          -- Allow access to unassigned loads created by users from the same company
          (
            driver_user_id IS NULL AND 
            created_by IN (
              SELECT ucr.user_id
              FROM user_company_roles ucr
              WHERE ucr.company_id IN (
                SELECT get_user_company_roles.company_id
                FROM get_user_company_roles(auth.uid())
              ) AND ucr.is_active = true
            )
          )
        )
      )
    )
  )
)
WITH CHECK (
  (auth.role() = 'service_role') OR 
  (
    auth.role() = 'authenticated' AND (
      -- Allow creating loads with assigned drivers from user's company
      (
        driver_user_id IN (
          SELECT ucr.user_id
          FROM user_company_roles ucr
          WHERE ucr.company_id IN (
            SELECT get_user_company_roles.company_id
            FROM get_user_company_roles(auth.uid())
          ) AND ucr.is_active = true
        )
      ) OR
      -- Allow creating loads without driver assignment
      (driver_user_id IS NULL)
    )
  )
);