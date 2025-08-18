-- Fix performance warning: optimize RLS policy for load_status_history
-- Replace auth.uid() with (select auth.uid()) to avoid re-evaluation per row

DROP POLICY IF EXISTS "load_status_history_company_access" ON public.load_status_history;

CREATE POLICY "load_status_history_company_access" 
ON public.load_status_history 
FOR ALL 
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'::text))::boolean, false) = false AND
  (
    -- User is the driver of the load
    load_id IN (
      SELECT l.id 
      FROM loads l
      WHERE l.driver_user_id = (SELECT auth.uid())
    )
    OR
    -- User has access through company (driver or client company)
    load_id IN (
      SELECT l.id 
      FROM loads l
      LEFT JOIN user_company_roles ucr_driver ON l.driver_user_id = ucr_driver.user_id AND ucr_driver.is_active = true
      LEFT JOIN company_clients cc ON l.client_id = cc.id
      WHERE 
        ucr_driver.company_id IN (
          SELECT ucr.company_id 
          FROM user_company_roles ucr 
          WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
        )
        OR 
        cc.company_id IN (
          SELECT ucr.company_id 
          FROM user_company_roles ucr 
          WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
        )
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'::text))::boolean, false) = false
);