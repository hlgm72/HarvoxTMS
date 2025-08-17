-- ============================================
-- CORRECCIÓN CRÍTICA DE SEGURIDAD - TABLA COMPANIES
-- ============================================

-- 1. Crear función segura para verificar acceso a empresa específica
CREATE OR REPLACE FUNCTION public.user_can_access_company(target_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Solo permitir acceso si el usuario tiene un rol activo en ESA empresa específica
  RETURN EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = target_company_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 2. Crear función para verificar si es owner de empresa específica
CREATE OR REPLACE FUNCTION public.user_is_company_owner(target_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = target_company_id
    AND role = 'company_owner'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 3. Crear función para verificar si es superadmin (sin acceso automático a todas las empresas)
CREATE OR REPLACE FUNCTION public.user_is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 4. ELIMINAR políticas existentes inseguras
DROP POLICY IF EXISTS "companies_basic_info_members_only" ON companies;
DROP POLICY IF EXISTS "companies_delete_superadmin_only" ON companies;
DROP POLICY IF EXISTS "companies_insert_superadmin_only" ON companies;
DROP POLICY IF EXISTS "companies_update_authorized_roles_only" ON companies;

-- 5. CREAR políticas de seguridad estrictas y restrictivas

-- SELECT: Solo usuarios con membresía activa en ESA empresa específica
CREATE POLICY "companies_secure_select_members_only" 
ON companies FOR SELECT 
TO authenticated 
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false)
  AND public.user_can_access_company(id)
);

-- INSERT: Solo superadmins pueden crear empresas
CREATE POLICY "companies_secure_insert_superadmin_only" 
ON companies FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false)
  AND public.user_is_superadmin()
);

-- UPDATE: Solo owners de la empresa específica pueden modificarla
CREATE POLICY "companies_secure_update_owners_only" 
ON companies FOR UPDATE 
TO authenticated 
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false)
  AND (public.user_is_company_owner(id) OR public.user_is_superadmin())
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false)
  AND (public.user_is_company_owner(id) OR public.user_is_superadmin())
);

-- DELETE: Prohibido para mayor seguridad (usar archivado en su lugar)
CREATE POLICY "companies_secure_delete_prohibited" 
ON companies FOR DELETE 
TO authenticated 
USING (false); -- Nunca permitir eliminación

-- 6. Asegurar que RLS esté habilitado
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 7. Crear vista segura para datos financieros sensibles (solo para owners)
CREATE OR REPLACE VIEW public.companies_financial_secure AS 
SELECT 
  id,
  name,
  -- Campos básicos siempre visibles
  street_address,
  state_id,
  zip_code,
  city,
  phone,
  email,
  status,
  plan_type,
  created_at,
  updated_at,
  -- Campos sensibles solo para owners
  CASE 
    WHEN public.user_is_company_owner(id) OR public.user_is_superadmin() 
    THEN ein 
    ELSE '***RESTRICTED***' 
  END as ein,
  CASE 
    WHEN public.user_is_company_owner(id) OR public.user_is_superadmin() 
    THEN dot_number 
    ELSE '***RESTRICTED***' 
  END as dot_number,
  CASE 
    WHEN public.user_is_company_owner(id) OR public.user_is_superadmin() 
    THEN mc_number 
    ELSE '***RESTRICTED***' 
  END as mc_number,
  CASE 
    WHEN public.user_is_company_owner(id) OR public.user_is_superadmin() 
    THEN default_leasing_percentage 
    ELSE NULL 
  END as default_leasing_percentage,
  CASE 
    WHEN public.user_is_company_owner(id) OR public.user_is_superadmin() 
    THEN default_factoring_percentage 
    ELSE NULL 
  END as default_factoring_percentage,
  CASE 
    WHEN public.user_is_company_owner(id) OR public.user_is_superadmin() 
    THEN default_dispatching_percentage 
    ELSE NULL 
  END as default_dispatching_percentage
FROM companies
WHERE public.user_can_access_company(id);

-- 8. Configurar RLS en la vista también
ALTER VIEW public.companies_financial_secure SET (security_barrier = true);

-- 9. Crear política de auditoría para accesos a datos sensibles
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Registrar acceso a datos financieros sensibles
  INSERT INTO company_sensitive_data_access_log (
    company_id, 
    accessed_by, 
    access_type,
    user_role,
    accessed_at
  ) VALUES (
    NEW.id,
    auth.uid(),
    'financial_data_access',
    (SELECT role FROM user_company_roles WHERE user_id = auth.uid() AND company_id = NEW.id AND is_active = true LIMIT 1),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 10. Crear trigger para auditoría (solo para accesos a datos sensibles)
DROP TRIGGER IF EXISTS audit_sensitive_company_access ON companies;
CREATE TRIGGER audit_sensitive_company_access
  AFTER SELECT ON companies
  FOR EACH ROW
  WHEN (pg_trigger_depth() = 0) -- Evitar recursión
  EXECUTE FUNCTION public.log_sensitive_data_access();