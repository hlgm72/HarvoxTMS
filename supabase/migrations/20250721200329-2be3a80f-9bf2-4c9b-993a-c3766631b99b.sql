-- Fix load_stops RLS policy with clearer approach
-- Drop the existing policy
DROP POLICY IF EXISTS "Load stops access policy" ON public.load_stops;

-- Create a simplified and clear policy
CREATE POLICY "Load stops access policy" ON public.load_stops
FOR ALL
USING (
  ((select auth.role()) = 'service_role') OR 
  (
    ((select auth.role()) = 'authenticated') AND 
    (load_id IN (
      SELECT loads.id
      FROM loads
      WHERE loads.driver_user_id IN (
        SELECT user_company_roles.user_id
        FROM user_company_roles
        WHERE user_company_roles.company_id IN (
          SELECT ucr.company_id
          FROM user_company_roles ucr
          WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
        )
        AND user_company_roles.is_active = true
      )
      OR loads.created_by = (select auth.uid())
    ))
  )
)
WITH CHECK (
  ((select auth.role()) = 'service_role') OR 
  (
    ((select auth.role()) = 'authenticated') AND 
    (load_id IN (
      SELECT loads.id
      FROM loads
      WHERE loads.driver_user_id IN (
        SELECT user_company_roles.user_id
        FROM user_company_roles
        WHERE user_company_roles.company_id IN (
          SELECT ucr.company_id
          FROM user_company_roles ucr
          WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
        )
        AND user_company_roles.is_active = true
      )
      OR loads.created_by = (select auth.uid())
    ))
  )
);