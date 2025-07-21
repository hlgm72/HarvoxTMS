-- Update the load_stops RLS policy to allow creating stops for loads without assigned drivers
DROP POLICY IF EXISTS "Load stops comprehensive policy" ON public.load_stops;

CREATE POLICY "Load stops comprehensive policy" ON public.load_stops
FOR ALL USING (
  (auth.role() = 'service_role') OR 
  (
    auth.role() = 'authenticated' AND (
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
          FROM get_user_company_roles(auth.uid())
        ) AND ucr.is_active = true
      )
    )
  )
)
WITH CHECK (
  (auth.role() = 'service_role') OR 
  (
    auth.role() = 'authenticated' AND (
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
          FROM get_user_company_roles(auth.uid())
        ) AND ucr.is_active = true
      )
    )
  )
);