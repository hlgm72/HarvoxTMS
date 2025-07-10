-- Primero, vamos a crear una función para verificar si un usuario es SuperAdmin
-- Esto nos ayudará a excluirlos explícitamente de acceso a datos de compañías
CREATE OR REPLACE FUNCTION public.is_superadmin(user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles 
    WHERE user_id = user_id_param 
    AND role = 'superadmin' 
    AND is_active = true
  );
$$;

-- Función para obtener compañías reales (excluyendo la del SuperAdmin)
CREATE OR REPLACE FUNCTION public.get_real_companies()
RETURNS TABLE(id UUID)
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT companies.id FROM public.companies 
  WHERE companies.name != 'SYSTEM_SUPERADMIN';
$$;

-- Actualizar políticas para COMPANY_DRIVERS
DROP POLICY IF EXISTS "Company members can view company driver profiles" ON public.company_drivers;
CREATE POLICY "Company members can view company driver profiles" 
ON public.company_drivers FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND company_id IN (SELECT id FROM public.get_real_companies())
    ) 
    AND ucr.is_active = true
  )
);

-- Actualizar políticas para DRIVER_PROFILES
DROP POLICY IF EXISTS "Company members can view company driver profiles" ON public.driver_profiles;
CREATE POLICY "Company members can view company driver profiles" 
ON public.driver_profiles FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND company_id IN (SELECT id FROM public.get_real_companies())
    ) 
    AND ucr.is_active = true
  )
);

-- Actualizar políticas para LOADS
DROP POLICY IF EXISTS "Company members can view company loads" ON public.loads;
CREATE POLICY "Company members can view company loads" 
ON public.loads FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND company_id IN (SELECT id FROM public.get_real_companies())
    ) 
    AND ucr.is_active = true
  )
);

-- Actualizar políticas para PAYMENT_PERIODS
DROP POLICY IF EXISTS "Company members can view company payment periods" ON public.payment_periods;
CREATE POLICY "Company members can view company payment periods" 
ON public.payment_periods FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND company_id IN (SELECT id FROM public.get_real_companies())
    ) 
    AND ucr.is_active = true
  )
);

-- Actualizar políticas para FUEL_EXPENSES
DROP POLICY IF EXISTS "Company members can view company fuel expenses" ON public.fuel_expenses;
CREATE POLICY "Company members can view company fuel expenses" 
ON public.fuel_expenses FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND company_id IN (SELECT id FROM public.get_real_companies())
    ) 
    AND ucr.is_active = true
  )
);

-- Actualizar políticas para COMPANY_BROKERS
DROP POLICY IF EXISTS "Company members can view company brokers" ON public.company_brokers;
CREATE POLICY "Company members can view company brokers" 
ON public.company_brokers FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
    AND ucr.company_id IN (SELECT id FROM public.get_real_companies())
  )
);

-- Crear política específica para SuperAdmin: SOLO puede ver estadísticas globales
-- Tabla para estadísticas del sistema que SÍ puede ver el SuperAdmin
CREATE TABLE IF NOT EXISTS public.system_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_type TEXT NOT NULL,
  stat_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para system_stats - Solo SuperAdmin puede ver
ALTER TABLE public.system_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin can view system stats" 
ON public.system_stats FOR SELECT
USING (public.is_superadmin());

CREATE POLICY "Service role can manage system stats" 
ON public.system_stats FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_system_stats_updated_at
  BEFORE UPDATE ON public.system_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();