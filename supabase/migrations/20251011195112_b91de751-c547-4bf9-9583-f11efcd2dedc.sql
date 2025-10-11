-- =====================================================
-- REFACTORING COMPLETO: ELIMINAR COMPANY_PAYMENT_PERIODS
-- Sistema simplificado: Solo user_payment_periods individuales
-- =====================================================

-- ============================================
-- PASO 1: AGREGAR CAMPOS A user_payment_periods
-- ============================================
ALTER TABLE public.user_payment_periods
ADD COLUMN IF NOT EXISTS period_start_date DATE,
ADD COLUMN IF NOT EXISTS period_end_date DATE,
ADD COLUMN IF NOT EXISTS period_frequency TEXT DEFAULT 'weekly',
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS locked_by UUID,
ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';

-- ============================================
-- PASO 2: MIGRAR DATOS EXISTENTES
-- Copiar fechas de períodos desde company_payment_periods
-- ============================================
UPDATE public.user_payment_periods upp
SET 
  period_start_date = cpp.period_start_date,
  period_end_date = cpp.period_end_date,
  period_frequency = cpp.period_frequency,
  payment_date = cpp.payment_date,
  is_locked = cpp.is_locked,
  locked_at = cpp.locked_at,
  locked_by = cpp.locked_by,
  period_type = cpp.period_type,
  status = cpp.status
FROM public.company_payment_periods cpp
WHERE upp.company_payment_period_id = cpp.id;

-- ============================================
-- PASO 3: HACER CAMPOS OBLIGATORIOS
-- ============================================
ALTER TABLE public.user_payment_periods
ALTER COLUMN period_start_date SET NOT NULL,
ALTER COLUMN period_end_date SET NOT NULL,
ALTER COLUMN period_frequency SET NOT NULL;

-- ============================================
-- PASO 4: CREAR ÍNDICES PARA RENDIMIENTO
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_payment_periods_user_dates 
ON public.user_payment_periods(user_id, period_start_date, period_end_date);

CREATE INDEX IF NOT EXISTS idx_user_payment_periods_dates 
ON public.user_payment_periods(period_start_date, period_end_date);

CREATE INDEX IF NOT EXISTS idx_user_payment_periods_status 
ON public.user_payment_periods(status) WHERE status = 'open';

-- ============================================
-- PASO 5: AGREGAR company_id A user_payment_periods
-- (para mantener relación directa con empresa)
-- ============================================
ALTER TABLE public.user_payment_periods
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Copiar company_id desde company_payment_periods
UPDATE public.user_payment_periods upp
SET company_id = cpp.company_id
FROM public.company_payment_periods cpp
WHERE upp.company_payment_period_id = cpp.id;

-- Hacer obligatorio
ALTER TABLE public.user_payment_periods
ALTER COLUMN company_id SET NOT NULL;

-- Agregar foreign key
ALTER TABLE public.user_payment_periods
ADD CONSTRAINT fk_user_payment_periods_company
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- ============================================
-- PASO 6: ACTUALIZAR loads PARA REFERENCIAR user_payment_periods
-- ============================================
-- Cambiar payment_period_id para que apunte a user_payment_periods
ALTER TABLE public.loads
DROP CONSTRAINT IF EXISTS loads_payment_period_id_fkey;

ALTER TABLE public.loads
ADD CONSTRAINT loads_payment_period_id_fkey
FOREIGN KEY (payment_period_id) REFERENCES public.user_payment_periods(id) ON DELETE SET NULL;

-- ============================================
-- PASO 7: ELIMINAR FUNCIÓN ANTERIOR Y RECREAR
-- ============================================
DROP FUNCTION IF EXISTS public.create_payment_period_if_needed(UUID, DATE, UUID);
DROP FUNCTION IF EXISTS public.create_payment_period_if_needed(UUID, DATE);

-- Ahora solo crea período para UN usuario específico
CREATE FUNCTION public.create_payment_period_if_needed(
  target_company_id UUID,
  target_date DATE,
  created_by_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_period_id UUID;
  new_period_id UUID;
  company_frequency TEXT;
  payment_cycle_day INTEGER;
  calculated_start_date DATE;
  calculated_end_date DATE;
  calculated_payment_date DATE;
BEGIN
  RAISE LOG 'create_payment_period_if_needed: company=%, date=%, user=%', 
    target_company_id, target_date, created_by_user_id;

  -- Buscar período existente para ESTE usuario en ESTA fecha
  SELECT id INTO existing_period_id
  FROM user_payment_periods
  WHERE user_id = created_by_user_id
    AND company_id = target_company_id
    AND target_date >= period_start_date
    AND target_date <= period_end_date
  LIMIT 1;

  IF existing_period_id IS NOT NULL THEN
    RAISE LOG 'create_payment_period_if_needed: Found existing period %', existing_period_id;
    RETURN existing_period_id;
  END IF;

  -- Obtener configuración de frecuencia de la empresa
  SELECT 
    COALESCE(cfs.default_payment_frequency, 'weekly'),
    COALESCE(cfs.payment_cycle_start_day, 1)
  INTO company_frequency, payment_cycle_day
  FROM company_financial_settings cfs
  WHERE cfs.company_id = target_company_id;

  -- Calcular fechas del período según frecuencia
  CASE company_frequency
    WHEN 'weekly' THEN
      -- Lunes a Domingo
      calculated_start_date := date_trunc('week', target_date)::DATE;
      calculated_end_date := calculated_start_date + INTERVAL '6 days';
      calculated_payment_date := calculated_start_date + INTERVAL '4 days'; -- Viernes
    
    WHEN 'biweekly' THEN
      -- Cada 14 días desde inicio del año
      DECLARE
        year_start DATE := date_trunc('year', target_date)::DATE;
        days_since_start INTEGER := target_date - year_start;
        period_number INTEGER := days_since_start / 14;
      BEGIN
        calculated_start_date := year_start + (period_number * 14);
        calculated_end_date := calculated_start_date + INTERVAL '13 days';
        calculated_payment_date := calculated_end_date; -- Último día del período
      END;
    
    WHEN 'monthly' THEN
      -- Primer día al último día del mes
      calculated_start_date := date_trunc('month', target_date)::DATE;
      calculated_end_date := (date_trunc('month', target_date) + INTERVAL '1 month - 1 day')::DATE;
      calculated_payment_date := calculated_end_date; -- Último día del mes
    
    ELSE
      -- Default: semanal
      calculated_start_date := date_trunc('week', target_date)::DATE;
      calculated_end_date := calculated_start_date + INTERVAL '6 days';
      calculated_payment_date := calculated_start_date + INTERVAL '4 days';
  END CASE;

  -- Crear período SOLO para este usuario
  INSERT INTO user_payment_periods (
    user_id,
    company_id,
    period_start_date,
    period_end_date,
    period_frequency,
    payment_date,
    gross_earnings,
    fuel_expenses,
    total_deductions,
    other_income,
    net_payment,
    has_negative_balance,
    payment_status,
    status,
    calculated_by
  ) VALUES (
    created_by_user_id,
    target_company_id,
    calculated_start_date,
    calculated_end_date,
    company_frequency,
    calculated_payment_date,
    0, 0, 0, 0, 0,
    false,
    'calculated',
    'open',
    created_by_user_id
  )
  RETURNING id INTO new_period_id;

  RAISE LOG 'create_payment_period_if_needed: Created new period % (% - %) for user %', 
    new_period_id, calculated_start_date, calculated_end_date, created_by_user_id;

  RETURN new_period_id;
END;
$$;

-- ============================================
-- PASO 8: ACTUALIZAR auto_recalculate_user_period
-- Simplificar para trabajar sin company_payment_periods
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_recalculate_user_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_calculation_id UUID;
  target_user_id UUID;
  recalc_flag TEXT;
BEGIN
  recalc_flag := current_setting('app.recalc_in_progress', true);
  IF recalc_flag = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'loads' THEN
      target_user_id := COALESCE(NEW.driver_user_id, OLD.driver_user_id);
      target_calculation_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
    WHEN 'fuel_expenses' THEN
      target_user_id := COALESCE(NEW.driver_user_id, OLD.driver_user_id);
      target_calculation_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
    WHEN 'expense_instances' THEN
      SELECT user_id INTO target_user_id
      FROM user_payment_periods
      WHERE id = COALESCE(NEW.payment_period_id, OLD.payment_period_id);
      target_calculation_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
    WHEN 'other_income' THEN
      target_user_id := COALESCE(NEW.user_id, OLD.user_id);
      target_calculation_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  END CASE;

  IF target_calculation_id IS NULL OR target_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Verificar si el período está bloqueado
  IF EXISTS (
    SELECT 1 FROM user_payment_periods
    WHERE id = target_calculation_id AND is_locked = true
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  PERFORM calculate_user_payment_period_with_validation(target_calculation_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================
-- PASO 9: ACTUALIZAR RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Driver period calculations select policy" ON public.user_payment_periods;
DROP POLICY IF EXISTS "driver_period_calculations_update_immutable_after_payment" ON public.user_payment_periods;
DROP POLICY IF EXISTS "driver_period_calculations_delete_immutable_after_payment" ON public.user_payment_periods;

CREATE POLICY "user_payment_periods_select_policy"
ON public.user_payment_periods
FOR SELECT
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND (
    auth.uid() = user_id
    OR company_id IN (
      SELECT company_id FROM user_company_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "user_payment_periods_update_if_not_locked"
ON public.user_payment_periods
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND auth.role() = 'authenticated'
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND NOT is_locked
  AND company_id IN (
    SELECT company_id FROM user_company_roles
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.role() = 'authenticated'
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND NOT is_locked
);

CREATE POLICY "user_payment_periods_delete_if_not_locked"
ON public.user_payment_periods
FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND auth.role() = 'authenticated'
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND NOT is_locked
  AND company_id IN (
    SELECT company_id FROM user_company_roles
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- ============================================
-- PASO 10: ELIMINAR TABLA company_payment_periods (CASCADE)
-- Esto eliminará automáticamente constraints y dependencias
-- ============================================
DROP TABLE IF EXISTS public.company_payment_periods CASCADE;

-- ============================================
-- PASO 11: ELIMINAR company_payment_period_id CON CASCADE
-- ============================================
ALTER TABLE public.user_payment_periods
DROP COLUMN IF EXISTS company_payment_period_id CASCADE;