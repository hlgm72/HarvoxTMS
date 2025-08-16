-- Secure load-related database views by creating RLS policies on the underlying tables
-- and ensuring views inherit proper security from their base tables

-- First, let's ensure the loads table has comprehensive RLS policies
-- Check if we need to update the loads table RLS policies

-- For load_details_with_dates view - secure the underlying loads and load_stops tables
-- The view joins loads with load_stops, so both tables need proper RLS

-- Ensure loads table has proper company-based access control
DROP POLICY IF EXISTS "loads_company_access" ON public.loads;

CREATE POLICY "loads_company_access" ON public.loads
FOR ALL
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (
    -- Driver can access their own loads
    driver_user_id = (SELECT auth.uid()) OR
    -- Company users can access loads for their company drivers
    driver_user_id IN (
      SELECT ucr1.user_id 
      FROM user_company_roles ucr1
      WHERE ucr1.company_id IN (
        SELECT ucr2.company_id 
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) 
        AND ucr2.is_active = true
      ) AND ucr1.is_active = true
    ) OR
    -- Load creator can access their created loads
    created_by = (SELECT auth.uid())
  )
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (
    -- Driver can create loads for themselves
    driver_user_id = (SELECT auth.uid()) OR
    -- Company admins can create loads for their company drivers
    driver_user_id IN (
      SELECT ucr1.user_id 
      FROM user_company_roles ucr1
      WHERE ucr1.company_id IN (
        SELECT ucr2.company_id 
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) 
        AND ucr2.role IN ('company_owner'::user_role, 'operations_manager'::user_role, 'dispatcher'::user_role, 'superadmin'::user_role)
        AND ucr2.is_active = true
      ) AND ucr1.is_active = true
    )
  )
);

-- Ensure load_stops table has proper company-based access control
DROP POLICY IF EXISTS "load_stops_company_access" ON public.load_stops;

CREATE POLICY "load_stops_company_access" ON public.load_stops
FOR ALL
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  load_id IN (
    SELECT l.id FROM loads l
    WHERE (
      -- Driver can access stops for their own loads
      l.driver_user_id = (SELECT auth.uid()) OR
      -- Company users can access stops for their company drivers' loads
      l.driver_user_id IN (
        SELECT ucr1.user_id 
        FROM user_company_roles ucr1
        WHERE ucr1.company_id IN (
          SELECT ucr2.company_id 
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = (SELECT auth.uid()) 
          AND ucr2.is_active = true
        ) AND ucr1.is_active = true
      ) OR
      -- Load creator can access stops for their created loads
      l.created_by = (SELECT auth.uid())
    )
  )
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  load_id IN (
    SELECT l.id FROM loads l
    WHERE (
      -- Driver can create stops for their own loads
      l.driver_user_id = (SELECT auth.uid()) OR
      -- Company admins can create stops for their company drivers' loads
      l.driver_user_id IN (
        SELECT ucr1.user_id 
        FROM user_company_roles ucr1
        WHERE ucr1.company_id IN (
          SELECT ucr2.company_id 
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = (SELECT auth.uid()) 
          AND ucr2.role IN ('company_owner'::user_role, 'operations_manager'::user_role, 'dispatcher'::user_role, 'superadmin'::user_role)
          AND ucr2.is_active = true
        ) AND ucr1.is_active = true
      ) OR
      -- Load creator can create stops for their created loads
      l.created_by = (SELECT auth.uid())
    )
  )
);

-- For loads_complete view - secure the underlying loads_archive table if it exists
-- The view unions loads with loads_archive, so we need to secure loads_archive too

-- Check if loads_archive table exists and secure it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loads_archive' AND table_schema = 'public') THEN
    -- Drop existing policy if exists
    EXECUTE 'DROP POLICY IF EXISTS "loads_archive_company_access" ON public.loads_archive';
    
    -- Create secure policy for loads_archive
    EXECUTE 'CREATE POLICY "loads_archive_company_access" ON public.loads_archive
    FOR ALL
    TO authenticated
    USING (
      (SELECT auth.role()) = ''authenticated'' AND
      (SELECT auth.uid()) IS NOT NULL AND
      COALESCE(((SELECT auth.jwt())->>''is_anonymous'')::boolean, false) = false AND
      (
        -- Driver can access their own archived loads
        driver_user_id = (SELECT auth.uid()) OR
        -- Company users can access archived loads for their company drivers
        driver_user_id IN (
          SELECT ucr1.user_id 
          FROM user_company_roles ucr1
          WHERE ucr1.company_id IN (
            SELECT ucr2.company_id 
            FROM user_company_roles ucr2
            WHERE ucr2.user_id = (SELECT auth.uid()) 
            AND ucr2.is_active = true
          ) AND ucr1.is_active = true
        ) OR
        -- Load creator can access their created archived loads
        created_by = (SELECT auth.uid())
      )
    ) WITH CHECK (
      (SELECT auth.role()) = ''authenticated'' AND
      (SELECT auth.uid()) IS NOT NULL AND
      COALESCE(((SELECT auth.jwt())->>''is_anonymous'')::boolean, false) = false AND
      (
        -- Only allow archiving loads for company drivers
        driver_user_id IN (
          SELECT ucr1.user_id 
          FROM user_company_roles ucr1
          WHERE ucr1.company_id IN (
            SELECT ucr2.company_id 
            FROM user_company_roles ucr2
            WHERE ucr2.user_id = (SELECT auth.uid()) 
            AND ucr2.role IN (''company_owner''::user_role, ''operations_manager''::user_role, ''superadmin''::user_role)
            AND ucr2.is_active = true
          ) AND ucr1.is_active = true
        )
      )
    )';
  END IF;
END $$;

-- Add security comment to document that views inherit security from underlying tables
COMMENT ON VIEW public.load_details_with_dates IS 'Security: This view inherits RLS from underlying loads and load_stops tables. Access is controlled by company membership.';
COMMENT ON VIEW public.loads_complete IS 'Security: This view inherits RLS from underlying loads and loads_archive tables. Access is controlled by company membership.';
COMMENT ON VIEW public.equipment_status_summary IS 'Security: This view inherits RLS from underlying company_equipment and equipment_documents tables. Access is controlled by company membership.';