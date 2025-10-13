-- ====================================================================
-- MIGRACIÓN v7: DROP TODO lo que depende de payment_period_id
-- ====================================================================

-- PASO 0: DROP triggers y funciones
DROP TRIGGER IF EXISTS auto_recalculate_trigger_loads ON public.loads CASCADE;
DROP TRIGGER IF EXISTS auto_recalculate_trigger_fuel ON public.fuel_expenses CASCADE;
DROP TRIGGER IF EXISTS auto_recalculate_trigger_expenses ON public.expense_instances CASCADE;
DROP TRIGGER IF EXISTS auto_recalculate_trigger_other_income ON public.other_income CASCADE;
DROP TRIGGER IF EXISTS update_expense_status_trigger ON public.user_payment_periods CASCADE;
DROP TRIGGER IF EXISTS auto_lock_period_trigger ON public.user_payment_periods CASCADE;
DROP TRIGGER IF EXISTS handle_load_driver_change_trigger ON public.loads CASCADE;
DROP TRIGGER IF EXISTS handle_new_load_stop_trigger ON public.load_stops CASCADE;
DROP TRIGGER IF EXISTS handle_load_stop_date_change_trigger ON public.load_stops CASCADE;

DROP FUNCTION IF EXISTS public.auto_recalculate_user_period() CASCADE;
DROP FUNCTION IF EXISTS public.auto_recalculate_on_other_income() CASCADE;
DROP FUNCTION IF EXISTS public.update_expense_status_on_payment() CASCADE;
DROP FUNCTION IF EXISTS public.auto_lock_period_when_all_paid() CASCADE;
DROP FUNCTION IF EXISTS public.handle_load_driver_change() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_load_stop() CASCADE;
DROP FUNCTION IF EXISTS public.handle_load_stop_date_change() CASCADE;
DROP FUNCTION IF EXISTS public.is_payment_period_empty(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_payment_period_locked(UUID) CASCADE;

-- DROP políticas RLS que dependen de payment_period_id
DROP POLICY IF EXISTS "loads_update_if_period_not_locked" ON public.loads;
DROP POLICY IF EXISTS "loads_delete_if_period_not_locked" ON public.loads;
DROP POLICY IF EXISTS "fuel_expenses_update_if_not_paid" ON public.fuel_expenses;
DROP POLICY IF EXISTS "fuel_expenses_delete_if_not_paid" ON public.fuel_expenses;

-- PASO 1: Crear company_payment_periods
CREATE TABLE IF NOT EXISTS public.company_payment_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  period_frequency TEXT NOT NULL CHECK (period_frequency IN ('weekly', 'biweekly', 'monthly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, period_start_date, period_end_date),
  CHECK (period_end_date > period_start_date)
);

CREATE INDEX IF NOT EXISTS idx_cpp_company ON public.company_payment_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_cpp_dates ON public.company_payment_periods(period_start_date, period_end_date);

ALTER TABLE public.company_payment_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cpp_select" ON public.company_payment_periods FOR SELECT
USING (auth.uid() IS NOT NULL AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) 
  AND company_id IN (SELECT company_id FROM user_company_roles WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "cpp_insert" ON public.company_payment_periods FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) 
  AND company_id IN (SELECT company_id FROM user_company_roles WHERE user_id = auth.uid() AND is_active = true 
  AND role IN ('company_owner', 'operations_manager', 'superadmin')));

CREATE POLICY "cpp_update" ON public.company_payment_periods FOR UPDATE
USING (auth.uid() IS NOT NULL AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) 
  AND company_id IN (SELECT company_id FROM user_company_roles WHERE user_id = auth.uid() AND is_active = true 
  AND role IN ('company_owner', 'operations_manager', 'superadmin')));

-- PASO 2: Agregar company_payment_period_id
ALTER TABLE public.user_payment_periods ADD COLUMN IF NOT EXISTS company_payment_period_id UUID;

-- PASO 3: Migrar datos
INSERT INTO public.company_payment_periods (company_id, period_start_date, period_end_date, period_frequency, created_at, created_by)
SELECT DISTINCT ON (company_id, period_start_date, period_end_date)
  company_id, period_start_date, period_end_date, period_frequency, created_at, calculated_by
FROM public.user_payment_periods
ORDER BY company_id, period_start_date, period_end_date, created_at
ON CONFLICT DO NOTHING;

UPDATE public.user_payment_periods upp SET company_payment_period_id = cpp.id
FROM public.company_payment_periods cpp
WHERE upp.company_id = cpp.company_id AND upp.period_start_date = cpp.period_start_date AND upp.period_end_date = cpp.period_end_date;

-- PASO 4: Renombrar user_payment_periods
ALTER TABLE public.user_payment_periods RENAME TO user_payrolls;
ALTER INDEX IF EXISTS idx_user_payment_periods_user RENAME TO idx_user_payrolls_user;
ALTER INDEX IF EXISTS idx_user_payment_periods_company RENAME TO idx_user_payrolls_company;
ALTER INDEX IF EXISTS idx_user_payment_periods_dates RENAME TO idx_user_payrolls_dates;
ALTER INDEX IF EXISTS idx_user_payment_periods_status RENAME TO idx_user_payrolls_status;

ALTER TABLE public.user_payrolls ADD CONSTRAINT fk_user_payrolls_cpp 
  FOREIGN KEY (company_payment_period_id) REFERENCES public.company_payment_periods(id) ON DELETE CASCADE;
ALTER TABLE public.user_payrolls ALTER COLUMN company_payment_period_id SET NOT NULL;

-- PASO 5-8: Actualizar FKs en operaciones (LOADS)
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS cpp_id UUID;
UPDATE public.loads l SET cpp_id = up.company_payment_period_id FROM public.user_payrolls up WHERE l.payment_period_id = up.id;
ALTER TABLE public.loads DROP COLUMN IF EXISTS payment_period_id CASCADE;
ALTER TABLE public.loads RENAME COLUMN cpp_id TO payment_period_id;
ALTER TABLE public.loads ADD CONSTRAINT loads_cpp_fk FOREIGN KEY (payment_period_id) REFERENCES public.company_payment_periods(id);

-- FUEL_EXPENSES
ALTER TABLE public.fuel_expenses ADD COLUMN IF NOT EXISTS cpp_id UUID;
UPDATE public.fuel_expenses fe SET cpp_id = up.company_payment_period_id FROM public.user_payrolls up WHERE fe.payment_period_id = up.id;
ALTER TABLE public.fuel_expenses DROP COLUMN IF EXISTS payment_period_id CASCADE;
ALTER TABLE public.fuel_expenses RENAME COLUMN cpp_id TO payment_period_id;
ALTER TABLE public.fuel_expenses ADD CONSTRAINT fuel_expenses_cpp_fk FOREIGN KEY (payment_period_id) REFERENCES public.company_payment_periods(id);

-- OTHER_INCOME
ALTER TABLE public.other_income ADD COLUMN IF NOT EXISTS cpp_id UUID;
UPDATE public.other_income oi SET cpp_id = up.company_payment_period_id FROM public.user_payrolls up WHERE oi.payment_period_id = up.id;
ALTER TABLE public.other_income DROP COLUMN IF EXISTS payment_period_id CASCADE;
ALTER TABLE public.other_income RENAME COLUMN cpp_id TO payment_period_id;
ALTER TABLE public.other_income ADD CONSTRAINT other_income_cpp_fk FOREIGN KEY (payment_period_id) REFERENCES public.company_payment_periods(id);

-- EXPENSE_INSTANCES
ALTER TABLE public.expense_instances ADD COLUMN IF NOT EXISTS cpp_id UUID;
UPDATE public.expense_instances ei SET cpp_id = up.company_payment_period_id FROM public.user_payrolls up WHERE ei.payment_period_id = up.id;
ALTER TABLE public.expense_instances DROP COLUMN IF EXISTS payment_period_id CASCADE;
ALTER TABLE public.expense_instances RENAME COLUMN cpp_id TO payment_period_id;
ALTER TABLE public.expense_instances ADD CONSTRAINT expense_instances_cpp_fk FOREIGN KEY (payment_period_id) REFERENCES public.company_payment_periods(id);

-- PASO 9: Actualizar RLS de user_payrolls
DROP POLICY IF EXISTS "user_payment_periods_select_policy" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payment_periods_update_if_not_locked" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payment_periods_delete_if_not_locked" ON public.user_payrolls;

CREATE POLICY "user_payrolls_select" ON public.user_payrolls FOR SELECT
USING (auth.uid() IS NOT NULL AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) 
  AND (user_id = auth.uid() OR company_id IN (SELECT company_id FROM user_company_roles WHERE user_id = auth.uid() AND is_active = true)));

CREATE POLICY "user_payrolls_update" ON public.user_payrolls FOR UPDATE
USING (auth.uid() IS NOT NULL AND NOT is_locked AND company_id IN (
  SELECT company_id FROM user_company_roles WHERE user_id = auth.uid() AND is_active = true 
  AND role IN ('company_owner', 'operations_manager', 'superadmin')));

CREATE POLICY "user_payrolls_delete" ON public.user_payrolls FOR DELETE
USING (auth.uid() IS NOT NULL AND NOT is_locked AND company_id IN (
  SELECT company_id FROM user_company_roles WHERE user_id = auth.uid() AND is_active = true 
  AND role IN ('company_owner', 'operations_manager', 'superadmin')));

-- PASO 10: Función para crear períodos bajo demanda
CREATE OR REPLACE FUNCTION public.create_company_payment_period_if_needed(
  target_company_id UUID, target_date DATE, created_by_user_id UUID
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing_period_id UUID; new_period_id UUID; company_frequency TEXT; calculated_start_date DATE; calculated_end_date DATE;
BEGIN
  SELECT id INTO existing_period_id FROM company_payment_periods WHERE company_id = target_company_id AND target_date BETWEEN period_start_date AND period_end_date LIMIT 1;
  IF existing_period_id IS NOT NULL THEN RETURN existing_period_id; END IF;
  SELECT COALESCE(default_payment_frequency, 'weekly') INTO company_frequency FROM company_financial_settings WHERE company_id = target_company_id;
  CASE company_frequency
    WHEN 'weekly' THEN calculated_start_date := date_trunc('week', target_date)::DATE; calculated_end_date := calculated_start_date + 6;
    WHEN 'biweekly' THEN DECLARE year_start DATE := date_trunc('year', target_date)::DATE; period_number INTEGER := (target_date - year_start) / 14; 
      BEGIN calculated_start_date := year_start + (period_number * 14); calculated_end_date := calculated_start_date + 13; END;
    WHEN 'monthly' THEN calculated_start_date := date_trunc('month', target_date)::DATE; calculated_end_date := (date_trunc('month', target_date) + INTERVAL '1 month - 1 day')::DATE;
    ELSE calculated_start_date := date_trunc('week', target_date)::DATE; calculated_end_date := calculated_start_date + 6;
  END CASE;
  INSERT INTO company_payment_periods (company_id, period_start_date, period_end_date, period_frequency, created_by)
  VALUES (target_company_id, calculated_start_date, calculated_end_date, company_frequency, created_by_user_id)
  ON CONFLICT (company_id, period_start_date, period_end_date) DO UPDATE SET updated_at = now() RETURNING id INTO new_period_id;
  RETURN new_period_id;
END; $$;