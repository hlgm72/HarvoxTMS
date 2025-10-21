-- ===============================================
-- CORRECCIÓN DE DATOS HISTÓRICOS
-- Fix: expense_instances en 'planned' para payrolls pagados
-- ===============================================

-- Crear tabla de auditoría para la corrección
CREATE TABLE IF NOT EXISTS public.data_fix_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fix_type TEXT NOT NULL,
  records_affected INTEGER NOT NULL,
  details JSONB,
  fixed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  fixed_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS en la tabla de auditoría
ALTER TABLE public.data_fix_audit ENABLE ROW LEVEL SECURITY;

-- Solo superadmins pueden ver los logs de corrección
CREATE POLICY "data_fix_audit_superadmin_only" ON public.data_fix_audit
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false)
  AND is_user_superadmin_safe(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false)
  AND is_user_superadmin_safe(auth.uid())
);

-- ===============================================
-- CORRECCIÓN 1: expense_instances de payrolls pagados
-- ===============================================

DO $$
DECLARE
  affected_count INTEGER;
  expense_details JSONB;
BEGIN
  -- Recopilar detalles de los expense_instances que se van a actualizar
  SELECT jsonb_agg(
    jsonb_build_object(
      'expense_instance_id', ei.id,
      'payroll_id', up.id,
      'user_id', up.user_id,
      'period_id', up.company_payment_period_id,
      'amount', ei.amount,
      'expense_type', et.name,
      'old_status', ei.status,
      'payroll_paid_at', up.paid_at
    )
  ) INTO expense_details
  FROM user_payrolls up
  JOIN expense_instances ei ON (
    ei.payment_period_id = up.company_payment_period_id 
    AND ei.user_id = up.user_id
  )
  LEFT JOIN expense_types et ON ei.expense_type_id = et.id
  WHERE up.payment_status = 'paid'
    AND ei.status != 'applied';

  -- Actualizar expense_instances a 'applied'
  UPDATE expense_instances ei
  SET 
    status = 'applied',
    applied_at = up.paid_at
  FROM user_payrolls up
  WHERE ei.payment_period_id = up.company_payment_period_id
    AND ei.user_id = up.user_id
    AND up.payment_status = 'paid'
    AND ei.status != 'applied';

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  -- Registrar la corrección en auditoría
  IF affected_count > 0 THEN
    INSERT INTO public.data_fix_audit (fix_type, records_affected, details)
    VALUES (
      'expense_instances_planned_to_applied_for_paid_payrolls',
      affected_count,
      jsonb_build_object(
        'description', 'Corrección de expense_instances que quedaron en estado planned para payrolls marcados como pagados',
        'reason', 'Error 403 RLS previo impedía la actualización desde el frontend',
        'affected_records', expense_details,
        'fixed_at', now()
      )
    );

    RAISE NOTICE 'Se corrigieron % expense_instances de planned a applied', affected_count;
  ELSE
    RAISE NOTICE 'No se encontraron expense_instances que requieran corrección';
  END IF;
END $$;

-- ===============================================
-- VERIFICACIÓN POST-CORRECCIÓN
-- ===============================================

-- Query de verificación (comentado, se puede ejecutar manualmente)
/*
SELECT 
  COUNT(*) as inconsistencias_restantes
FROM user_payrolls up
JOIN expense_instances ei ON (
  ei.payment_period_id = up.company_payment_period_id 
  AND ei.user_id = up.user_id
)
WHERE up.payment_status = 'paid'
  AND ei.status != 'applied';
*/