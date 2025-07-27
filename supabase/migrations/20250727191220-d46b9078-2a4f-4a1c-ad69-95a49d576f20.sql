-- Comprehensive security linter fixes - Final Part
-- Fix remaining tables and critical ones

-- 19. Fix inspections
DROP POLICY IF EXISTS "Inspections company access" ON public.inspections;
CREATE POLICY "Inspections company access" ON public.inspections
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

-- 20. Fix load_documents
DROP POLICY IF EXISTS "Users can view load documents from their company loads" ON public.load_documents;
CREATE POLICY "Users can view load documents from their company loads" ON public.load_documents
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND
  load_id IN (
    SELECT l.id FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Users can update load documents from their company loads" ON public.load_documents;
CREATE POLICY "Users can update load documents from their company loads" ON public.load_documents
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND
  load_id IN (
    SELECT l.id FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND
  load_id IN (
    SELECT l.id FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Users can delete load documents from their company loads" ON public.load_documents;
CREATE POLICY "Users can delete load documents from their company loads" ON public.load_documents
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND
  load_id IN (
    SELECT l.id FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

-- 21. Fix load_stops
DROP POLICY IF EXISTS "Load stops access policy" ON public.load_stops;
CREATE POLICY "Load stops access policy" ON public.load_stops
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND
  load_id IN (
    SELECT l.id FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND
  load_id IN (
    SELECT l.id FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

-- 22. Fix loads
DROP POLICY IF EXISTS "Loads comprehensive policy" ON public.loads;
CREATE POLICY "Loads comprehensive policy" ON public.loads
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    auth.uid() = driver_user_id OR
    auth.uid() = created_by OR
    driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    ) OR
    created_by IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND (
    auth.uid() = created_by OR
    created_by IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

-- 23. Fix maintenance tables
DROP POLICY IF EXISTS "Maintenance records company access" ON public.maintenance_records;
CREATE POLICY "Maintenance records company access" ON public.maintenance_records
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Maintenance schedules company access" ON public.maintenance_schedules;
CREATE POLICY "Maintenance schedules company access" ON public.maintenance_schedules
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

-- 24. Fix maintenance_types (service role only can modify)
DROP POLICY IF EXISTS "Maintenance types comprehensive access" ON public.maintenance_types;
CREATE POLICY "Maintenance types read access" ON public.maintenance_types
FOR SELECT 
TO authenticated
USING (require_authenticated_user());

-- 25. Fix other_income
DROP POLICY IF EXISTS "Other income comprehensive policy" ON public.other_income;
CREATE POLICY "Other income comprehensive policy" ON public.other_income
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    auth.uid() = driver_user_id OR
    driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  driver_user_id IN (
    SELECT ucr.user_id FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);