-- ============================================
-- RECREAR SISTEMA DE SEGURIDAD PASO A PASO
-- ============================================

-- 1. Primero crear las funciones de seguridad
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

-- 2. Verificar que las funciones se crearon
SELECT proname, prosrc FROM pg_proc WHERE proname LIKE 'user_%' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');