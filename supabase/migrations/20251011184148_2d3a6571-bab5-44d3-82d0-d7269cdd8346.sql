-- ===============================================
-- 🚨 CORREGIR SEGURIDAD: Habilitar RLS en tablas de respaldo
-- ===============================================

-- Habilitar RLS en todas las tablas de respaldo
ALTER TABLE driver_period_calculations_backup_20250211 ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_payment_periods_backup_20250211 ENABLE ROW LEVEL SECURITY;
ALTER TABLE loads_backup_20250211 ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_fk_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_audit_log ENABLE ROW LEVEL SECURITY;

-- Crear políticas restrictivas (solo superadmins)
CREATE POLICY "Backup tables superadmin only" 
ON driver_period_calculations_backup_20250211
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
);

CREATE POLICY "Backup tables superadmin only" 
ON company_payment_periods_backup_20250211
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
);

CREATE POLICY "Backup tables superadmin only" 
ON loads_backup_20250211
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
);

CREATE POLICY "Migration FK backup superadmin only" 
ON migration_fk_backup
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
);

CREATE POLICY "Migration audit log superadmin only" 
ON migration_audit_log
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
);

-- Log
INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('security', 'enable_rls_on_backup_tables', 'completed');