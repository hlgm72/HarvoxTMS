-- Continue fixing security warnings: Update remaining policies

-- 6. Fix maintenance_records policy
DROP POLICY IF EXISTS "Maintenance records company access" ON public.maintenance_records;
CREATE POLICY "Maintenance records company access" 
ON public.maintenance_records 
FOR ALL TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  equipment_id IN (
    SELECT ce.id
    FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  equipment_id IN (
    SELECT ce.id
    FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

-- 7. Fix maintenance_schedules policy
DROP POLICY IF EXISTS "Maintenance schedules company access" ON public.maintenance_schedules;
CREATE POLICY "Maintenance schedules company access" 
ON public.maintenance_schedules 
FOR ALL TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  equipment_id IN (
    SELECT ce.id
    FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  equipment_id IN (
    SELECT ce.id
    FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

-- 8. Fix maintenance_types policy
DROP POLICY IF EXISTS "Maintenance types read access" ON public.maintenance_types;
CREATE POLICY "Maintenance types read access" 
ON public.maintenance_types 
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 9. Fix security_audit_log policy
DROP POLICY IF EXISTS "Superadmins can view audit logs" ON public.security_audit_log;
CREATE POLICY "Superadmins can view audit logs" 
ON public.security_audit_log 
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  is_superadmin()
);