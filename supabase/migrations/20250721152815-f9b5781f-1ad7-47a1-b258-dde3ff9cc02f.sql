-- Fix ambiguous company_id reference in load_stops RLS policy
-- Drop the existing policy first
DROP POLICY IF EXISTS "Load stops access policy" ON public.load_stops;

-- Create a new policy with properly qualified column references
CREATE POLICY "Load stops access policy" ON public.load_stops
FOR ALL
USING (
  (auth.role() = 'service_role') OR 
  (
    (auth.role() = 'authenticated') AND 
    (load_id IN (
      SELECT l.id
      FROM loads l
      JOIN user_company_roles ucr1 ON (
        (
          (l.driver_user_id = ucr1.user_id AND ucr1.user_id = auth.uid()) OR
          (
            l.driver_user_id IS NULL AND 
            l.created_by IN (
              SELECT ucr2.user_id
              FROM user_company_roles ucr2
              WHERE ucr2.company_id = ucr1.company_id AND ucr2.is_active = true
            )
          )
        )
      )
      WHERE ucr1.user_id = auth.uid() AND ucr1.is_active = true
    ))
  )
)
WITH CHECK (
  (auth.role() = 'service_role') OR 
  (
    (auth.role() = 'authenticated') AND 
    (load_id IN (
      SELECT l.id
      FROM loads l
      JOIN user_company_roles ucr1 ON (
        (
          (l.driver_user_id = ucr1.user_id AND ucr1.user_id = auth.uid()) OR
          (
            l.driver_user_id IS NULL AND 
            l.created_by IN (
              SELECT ucr2.user_id
              FROM user_company_roles ucr2
              WHERE ucr2.company_id = ucr1.company_id AND ucr2.is_active = true
            )
          )
        )
      )
      WHERE ucr1.user_id = auth.uid() AND ucr1.is_active = true
    ))
  )
);