-- ===============================================
-- MIGRACIÓN v8: IDEMPOTENTE - verifica estado actual
-- ===============================================

-- Crear company_payment_periods si no existe
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

-- RLS para company_payment_periods
DO $$ BEGIN
  ALTER TABLE public.company_payment_periods ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP POLICY IF EXISTS "cpp_select" ON public.company_payment_periods;
CREATE POLICY "cpp_select" ON public.company_payment_periods FOR SELECT
USING (auth.uid() IS NOT NULL AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) 
  AND company_id IN (SELECT company_id FROM user_company_roles WHERE user_id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "cpp_insert" ON public.company_payment_periods;
CREATE POLICY "cpp_insert" ON public.company_payment_periods FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) 
  AND company_id IN (SELECT company_id FROM user_company_roles WHERE user_id = auth.uid() AND is_active = true 
  AND role IN ('company_owner', 'operations_manager', 'superadmin')));

DROP POLICY IF EXISTS "cpp_update" ON public.company_payment_periods;
CREATE POLICY "cpp_update" ON public.company_payment_periods FOR UPDATE
USING (auth.uid() IS NOT NULL AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) 
  AND company_id IN (SELECT company_id FROM user_company_roles WHERE user_id = auth.uid() AND is_active = true 
  AND role IN ('company_owner', 'operations_manager', 'superadmin')));

-- Agregar company_payment_period_id a user_payrolls si no existe
DO $$ BEGIN
  ALTER TABLE public.user_payrolls ADD COLUMN IF NOT EXISTS company_payment_period_id UUID;
EXCEPTION WHEN undefined_table THEN 
  -- Si user_payrolls no existe, posiblemente aún se llama user_payment_periods
  ALTER TABLE public.user_payment_periods ADD COLUMN IF NOT EXISTS company_payment_period_id UUID;
END $$;

-- Migrar datos si no se han migrado aún
INSERT INTO public.company_payment_periods (company_id, period_start_date, period_end_date, period_frequency, created_at, created_by)
SELECT DISTINCT ON (company_id, period_start_date, period_end_date)
  company_id, period_start_date, period_end_date, period_frequency, created_at, calculated_by
FROM public.user_payrolls
WHERE company_payment_period_id IS NULL
ORDER BY company_id, period_start_date, period_end_date, created_at
ON CONFLICT DO NOTHING;

-- Actualizar company_payment_period_id si es NULL
UPDATE public.user_payrolls upp SET company_payment_period_id = cpp.id
FROM public.company_payment_periods cpp
WHERE upp.company_payment_period_id IS NULL
  AND upp.company_id = cpp.company_id 
  AND upp.period_start_date = cpp.period_start_date 
  AND upp.period_end_date = cpp.period_end_date;

-- Agregar FK si no existe
DO $$ BEGIN
  ALTER TABLE public.user_payrolls ADD CONSTRAINT fk_user_payrolls_cpp 
    FOREIGN KEY (company_payment_period_id) REFERENCES public.company_payment_periods(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Hacer NOT NULL si no lo es ya
DO $$ BEGIN
  ALTER TABLE public.user_payrolls ALTER COLUMN company_payment_period_id SET NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Actualizar RLS de user_payrolls
DROP POLICY IF EXISTS "user_payment_periods_select_policy" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payment_periods_update_if_not_locked" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payment_periods_delete_if_not_locked" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payrolls_select" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payrolls_update" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payrolls_delete" ON public.user_payrolls;

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

-- Función para crear períodos
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