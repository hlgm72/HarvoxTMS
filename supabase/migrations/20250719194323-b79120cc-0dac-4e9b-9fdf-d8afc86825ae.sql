-- Solucionar errores del linter de Supabase
-- 1. Optimizar políticas RLS reemplazando auth.uid() con (select auth.uid())

-- 1.1 Optimizar política de company_equipment
DROP POLICY IF EXISTS "Company equipment access policy" ON public.company_equipment;
CREATE POLICY "Company equipment access policy" 
ON public.company_equipment
FOR ALL
USING (
  (select auth.role()) = 'service_role'::text 
  OR 
  (
    (select auth.role()) = 'authenticated'::text 
    AND company_id IN (
      SELECT get_user_company_roles.company_id
      FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
    )
  )
)
WITH CHECK (
  (select auth.role()) = 'service_role'::text 
  OR 
  (
    (select auth.role()) = 'authenticated'::text 
    AND company_id IN (
      SELECT get_user_company_roles.company_id
      FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
    )
  )
);

-- 1.2 Optimizar política de equipment_documents
DROP POLICY IF EXISTS "Equipment documents access policy" ON public.equipment_documents;
CREATE POLICY "Equipment documents access policy" 
ON public.equipment_documents
FOR ALL
USING (
  (select auth.role()) = 'service_role'::text 
  OR 
  (
    (select auth.role()) = 'authenticated'::text 
    AND equipment_id IN (
      SELECT ce.id
      FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      )
    )
  )
)
WITH CHECK (
  (select auth.role()) = 'service_role'::text 
  OR 
  (
    (select auth.role()) = 'authenticated'::text 
    AND equipment_id IN (
      SELECT ce.id
      FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      )
    )
  )
);

-- 1.3 Optimizar política de maintenance_schedules
DROP POLICY IF EXISTS "Maintenance schedules company access" ON public.maintenance_schedules;
CREATE POLICY "Maintenance schedules company access" 
ON public.maintenance_schedules
FOR ALL
USING (
  (select auth.role()) = 'service_role'::text 
  OR 
  (
    (select auth.role()) = 'authenticated'::text 
    AND equipment_id IN (
      SELECT ce.id
      FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      )
    )
  )
)
WITH CHECK (
  (select auth.role()) = 'service_role'::text 
  OR 
  (
    (select auth.role()) = 'authenticated'::text 
    AND equipment_id IN (
      SELECT ce.id
      FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      )
    )
  )
);

-- 1.4 Optimizar política de maintenance_records
DROP POLICY IF EXISTS "Maintenance records company access" ON public.maintenance_records;
CREATE POLICY "Maintenance records company access" 
ON public.maintenance_records
FOR ALL
USING (
  (select auth.role()) = 'service_role'::text 
  OR 
  (
    (select auth.role()) = 'authenticated'::text 
    AND equipment_id IN (
      SELECT ce.id
      FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      )
    )
  )
)
WITH CHECK (
  (select auth.role()) = 'service_role'::text 
  OR 
  (
    (select auth.role()) = 'authenticated'::text 
    AND equipment_id IN (
      SELECT ce.id
      FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      )
    )
  )
);

-- 1.5 Optimizar política de inspections
DROP POLICY IF EXISTS "Inspections company access" ON public.inspections;
CREATE POLICY "Inspections company access" 
ON public.inspections
FOR ALL
USING (
  (select auth.role()) = 'service_role'::text 
  OR 
  (
    (select auth.role()) = 'authenticated'::text 
    AND equipment_id IN (
      SELECT ce.id
      FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      )
    )
  )
)
WITH CHECK (
  (select auth.role()) = 'service_role'::text 
  OR 
  (
    (select auth.role()) = 'authenticated'::text 
    AND equipment_id IN (
      SELECT ce.id
      FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      )
    )
  )
);

-- 1.6 Optimizar política de equipment_assignments
DROP POLICY IF EXISTS "Equipment assignments company access" ON public.equipment_assignments;
CREATE POLICY "Equipment assignments company access" 
ON public.equipment_assignments
FOR ALL
USING (
  (select auth.role()) = 'service_role'::text 
  OR 
  (
    (select auth.role()) = 'authenticated'::text 
    AND (
      (select auth.uid()) = driver_user_id 
      OR equipment_id IN (
        SELECT ce.id
        FROM company_equipment ce
        WHERE ce.company_id IN (
          SELECT get_user_company_roles.company_id
          FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
        )
      )
    )
  )
)
WITH CHECK (
  (select auth.role()) = 'service_role'::text 
  OR 
  (
    (select auth.role()) = 'authenticated'::text 
    AND equipment_id IN (
      SELECT ce.id
      FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      )
    )
  )
);

-- 1.7 Optimizar política de equipment_locations
DROP POLICY IF EXISTS "Equipment locations company access" ON public.equipment_locations;
CREATE POLICY "Equipment locations company access" 
ON public.equipment_locations
FOR ALL
USING (
  (select auth.role()) = 'service_role'::text 
  OR 
  (
    (select auth.role()) = 'authenticated'::text 
    AND equipment_id IN (
      SELECT ce.id
      FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      )
    )
  )
)
WITH CHECK (
  (select auth.role()) = 'service_role'::text 
  OR 
  (
    (select auth.role()) = 'authenticated'::text 
    AND equipment_id IN (
      SELECT ce.id
      FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      )
    )
  )
);

-- 2. Consolidar políticas múltiples permisivas

-- 2.1 Consolidar políticas de geotab_drivers
DROP POLICY IF EXISTS "Allow read access to geotab drivers" ON public.geotab_drivers;
DROP POLICY IF EXISTS "Allow service role to manage geotab drivers" ON public.geotab_drivers;

CREATE POLICY "Geotab drivers comprehensive access" 
ON public.geotab_drivers
FOR ALL
USING (
  (select auth.role()) = 'service_role'::text 
  OR 
  true  -- Permitir acceso de lectura a todos
)
WITH CHECK (
  (select auth.role()) = 'service_role'::text  -- Solo service role puede modificar
);

-- 2.2 Consolidar políticas de maintenance_types
DROP POLICY IF EXISTS "Maintenance types are viewable by authenticated users" ON public.maintenance_types;
DROP POLICY IF EXISTS "Maintenance types are manageable by admins" ON public.maintenance_types;

CREATE POLICY "Maintenance types comprehensive access" 
ON public.maintenance_types
FOR ALL
USING (
  (select auth.role()) = 'service_role'::text 
  OR 
  (select auth.role()) = 'authenticated'::text  -- Usuarios autenticados pueden leer
)
WITH CHECK (
  (select auth.role()) = 'service_role'::text 
  OR 
  (
    (select auth.role()) = 'authenticated'::text 
    AND EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (select auth.uid()) 
      AND role IN ('superadmin', 'company_owner', 'general_manager', 'operations_manager')
      AND is_active = true
    )
  )
);

-- 3. Eliminar índice duplicado en loads
DROP INDEX IF EXISTS public.loads_load_number_key;

-- Registrar la optimización en system_stats
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_performance_optimization', jsonb_build_object(
  'timestamp', now(),
  'description', 'Fixed Supabase linter warnings',
  'optimizations', jsonb_build_object(
    'auth_rls_initplan_fixed', ARRAY[
      'company_equipment', 
      'equipment_documents', 
      'maintenance_schedules', 
      'maintenance_records', 
      'inspections', 
      'equipment_assignments', 
      'equipment_locations'
    ],
    'multiple_permissive_policies_consolidated', ARRAY[
      'geotab_drivers',
      'maintenance_types'
    ],
    'duplicate_indexes_removed', ARRAY[
      'loads_load_number_key'
    ]
  ),
  'performance_improvement', 'Optimized RLS policies for better query performance'
));