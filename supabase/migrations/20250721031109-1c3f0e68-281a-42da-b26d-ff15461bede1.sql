-- Optimize RLS policies to improve performance by using SELECT wrappers

-- Fix loads table policy
DROP POLICY IF EXISTS "Loads comprehensive policy" ON public.loads;

CREATE POLICY "Loads comprehensive policy" ON public.loads
FOR ALL USING (
  ((SELECT auth.role()) = 'service_role') OR 
  (
    (SELECT auth.role()) = 'authenticated' AND (
      -- Users can see loads they are assigned to drive
      ((SELECT auth.uid()) = driver_user_id) OR
      -- Users can see loads from their company (including unassigned loads)
      (
        NOT is_superadmin((SELECT auth.uid())) AND 
        (
          driver_user_id IN (
            SELECT ucr.user_id
            FROM user_company_roles ucr
            WHERE ucr.company_id IN (
              SELECT get_user_company_roles.company_id
              FROM get_user_company_roles((SELECT auth.uid()))
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
                FROM get_user_company_roles((SELECT auth.uid()))
              ) AND ucr.is_active = true
            )
          )
        )
      )
    )
  )
)
WITH CHECK (
  ((SELECT auth.role()) = 'service_role') OR 
  (
    (SELECT auth.role()) = 'authenticated' AND (
      -- Allow creating loads with assigned drivers from user's company
      (
        driver_user_id IN (
          SELECT ucr.user_id
          FROM user_company_roles ucr
          WHERE ucr.company_id IN (
            SELECT get_user_company_roles.company_id
            FROM get_user_company_roles((SELECT auth.uid()))
          ) AND ucr.is_active = true
        )
      ) OR
      -- Allow creating loads without driver assignment
      (driver_user_id IS NULL)
    )
  )
);

-- Fix load_stops table policy
DROP POLICY IF EXISTS "Load stops comprehensive policy" ON public.load_stops;

CREATE POLICY "Load stops comprehensive policy" ON public.load_stops
FOR ALL USING (
  ((SELECT auth.role()) = 'service_role') OR 
  (
    (SELECT auth.role()) = 'authenticated' AND (
      load_id IN (
        SELECT l.id
        FROM public.loads l
        JOIN public.user_company_roles ucr ON (
          -- Allow if load has assigned driver from user's company
          (l.driver_user_id = ucr.user_id) OR
          -- Allow if load has no driver but was created by someone from user's company
          (
            l.driver_user_id IS NULL AND 
            l.created_by IN (
              SELECT ucr2.user_id
              FROM public.user_company_roles ucr2
              WHERE ucr2.company_id = ucr.company_id AND ucr2.is_active = true
            )
          )
        )
        WHERE ucr.company_id IN (
          SELECT get_user_company_roles.company_id
          FROM get_user_company_roles((SELECT auth.uid()))
        ) AND ucr.is_active = true
      )
    )
  )
)
WITH CHECK (
  ((SELECT auth.role()) = 'service_role') OR 
  (
    (SELECT auth.role()) = 'authenticated' AND (
      load_id IN (
        SELECT l.id
        FROM public.loads l
        JOIN public.user_company_roles ucr ON (
          -- Allow if load has assigned driver from user's company
          (l.driver_user_id = ucr.user_id) OR
          -- Allow if load has no driver but was created by someone from user's company
          (
            l.driver_user_id IS NULL AND 
            l.created_by IN (
              SELECT ucr2.user_id
              FROM public.user_company_roles ucr2
              WHERE ucr2.company_id = ucr.company_id AND ucr2.is_active = true
            )
          )
        )
        WHERE ucr.company_id IN (
          SELECT get_user_company_roles.company_id
          FROM get_user_company_roles((SELECT auth.uid()))
        ) AND ucr.is_active = true
      )
    )
  )
);