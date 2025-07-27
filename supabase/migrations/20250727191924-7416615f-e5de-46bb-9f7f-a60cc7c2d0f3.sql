-- Fix RLS performance issues by optimizing auth function calls
-- Replace auth.uid() with (select auth.uid()) to avoid re-evaluation per row

-- 1. Fix us_cities policy
DROP POLICY IF EXISTS "Service role can modify US cities" ON public.us_cities;
CREATE POLICY "Service role can modify US cities" ON public.us_cities
FOR ALL 
TO service_role
USING ((SELECT auth.role()) = 'service_role'::text)
WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

-- 2. Fix zip_codes policy  
DROP POLICY IF EXISTS "Service role can modify ZIP codes" ON public.zip_codes;
CREATE POLICY "Service role can modify ZIP codes" ON public.zip_codes
FOR ALL 
TO service_role
USING ((SELECT auth.role()) = 'service_role'::text)
WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

-- 3. Fix zip_city_links policy
DROP POLICY IF EXISTS "Service role can modify ZIP city links" ON public.zip_city_links;
CREATE POLICY "Service role can modify ZIP city links" ON public.zip_city_links
FOR ALL 
TO service_role
USING ((SELECT auth.role()) = 'service_role'::text)
WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

-- 4. Fix equipment_assignments policy
DROP POLICY IF EXISTS "Equipment assignments company access" ON public.equipment_assignments;
CREATE POLICY "Equipment assignments company access" ON public.equipment_assignments
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    (SELECT auth.uid()) = driver_user_id OR 
    equipment_id IN (
      SELECT ce.id FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT ucr.company_id FROM user_company_roles ucr
        WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
      )
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

-- 5. Fix equipment_documents policy
DROP POLICY IF EXISTS "Equipment documents access policy" ON public.equipment_documents;
CREATE POLICY "Equipment documents access policy" ON public.equipment_documents
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

-- 6. Fix equipment_locations policy
DROP POLICY IF EXISTS "Equipment locations company access" ON public.equipment_locations;
CREATE POLICY "Equipment locations company access" ON public.equipment_locations
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

-- 7. Fix expense_instances policies
DROP POLICY IF EXISTS "Users can view expense_instances for their company" ON public.expense_instances;
CREATE POLICY "Users can view expense_instances for their company" ON public.expense_instances
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND 
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Users can update expense_instances for their company" ON public.expense_instances;
CREATE POLICY "Users can update expense_instances for their company" ON public.expense_instances
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND 
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true 
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'dispatcher'::user_role, 'operations_manager'::user_role])
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true 
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'dispatcher'::user_role, 'operations_manager'::user_role])
  )
);

DROP POLICY IF EXISTS "Users can delete expense_instances for their company" ON public.expense_instances;
CREATE POLICY "Users can delete expense_instances for their company" ON public.expense_instances
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND 
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true 
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'dispatcher'::user_role, 'operations_manager'::user_role])
  )
);

-- 8. Fix expense_template_history policy
DROP POLICY IF EXISTS "Expense template history complete policy" ON public.expense_template_history;
CREATE POLICY "Expense template history complete policy" ON public.expense_template_history
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  template_id IN (
    SELECT ret.id FROM recurring_expense_templates ret
    JOIN user_company_roles ucr ON ret.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  template_id IN (
    SELECT ret.id FROM recurring_expense_templates ret
    JOIN user_company_roles ucr ON ret.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

-- 9. Fix expense_types policy
DROP POLICY IF EXISTS "Expense types complete policy" ON public.expense_types;
CREATE POLICY "Expense types complete policy" ON public.expense_types
FOR ALL 
TO authenticated
USING (require_authenticated_user())
WITH CHECK (
  require_authenticated_user() AND 
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_company_roles.user_id = (SELECT auth.uid()) AND user_company_roles.is_active = true
  )
);

-- 10. Fix companies policy
DROP POLICY IF EXISTS "SuperAdmin complete access" ON public.companies;
CREATE POLICY "SuperAdmin complete access" ON public.companies
FOR ALL 
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.role = 'superadmin'::user_role AND ucr.is_active = true
    ) OR 
    id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.role = 'superadmin'::user_role AND ucr.is_active = true
    ) OR 
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.company_id = companies.id 
      AND ucr.role = 'company_owner'::user_role AND ucr.is_active = true
    )
  )
);

-- 11. Fix company_clients policy
DROP POLICY IF EXISTS "Company clients complete policy" ON public.company_clients;
CREATE POLICY "Company clients complete policy" ON public.company_clients
FOR ALL 
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND NOT is_superadmin((SELECT auth.uid())) AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

-- Continue with more policies...
-- 12. Fix geotab tables policies
DROP POLICY IF EXISTS "Authenticated users can access geotab drivers" ON public.geotab_drivers;
CREATE POLICY "Authenticated users can access geotab drivers" ON public.geotab_drivers
FOR ALL 
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL)
WITH CHECK (false);

DROP POLICY IF EXISTS "Authenticated users can read vehicle assignments" ON public.geotab_vehicle_assignments;
CREATE POLICY "Authenticated users can read vehicle assignments" ON public.geotab_vehicle_assignments
FOR SELECT 
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can read vehicle positions" ON public.geotab_vehicle_positions;
CREATE POLICY "Authenticated users can read vehicle positions" ON public.geotab_vehicle_positions
FOR SELECT 
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can read vehicles" ON public.geotab_vehicles;
CREATE POLICY "Authenticated users can read vehicles" ON public.geotab_vehicles
FOR SELECT 
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

-- 13. Fix fuel_card_providers policies
DROP POLICY IF EXISTS "Company managers can update fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Company managers can update fuel card providers" ON public.fuel_card_providers
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
    AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
    AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Company managers can delete fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Company managers can delete fuel card providers" ON public.fuel_card_providers
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
    AND ucr.is_active = true
  )
);

-- 14. Fix remaining company table policies
DROP POLICY IF EXISTS "Company client contacts complete policy" ON public.company_client_contacts;
CREATE POLICY "Company client contacts complete policy" ON public.company_client_contacts
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  client_id IN (
    SELECT cc.id FROM company_clients cc
    WHERE cc.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  client_id IN (
    SELECT cc.id FROM company_clients cc
    WHERE cc.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Company documents complete policy" ON public.company_documents;
CREATE POLICY "Company documents complete policy" ON public.company_documents
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Company drivers complete policy" ON public.company_drivers;
CREATE POLICY "Company drivers complete policy" ON public.company_drivers
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    (SELECT auth.uid()) = user_id OR 
    user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND (SELECT auth.uid()) = user_id
);

DROP POLICY IF EXISTS "Company equipment access policy" ON public.company_equipment;
CREATE POLICY "Company equipment access policy" ON public.company_equipment
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

-- Continue with remaining policies that need optimization...