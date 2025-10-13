-- ===============================================
-- Limpieza de columnas innecesarias en user_payrolls
-- ===============================================

-- 1. Eliminar políticas que dependen de is_locked
DROP POLICY IF EXISTS "user_payrolls_update" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payrolls_delete" ON public.user_payrolls;

-- 2. Eliminar columnas de período (duplicadas de company_payment_periods)
ALTER TABLE user_payrolls 
  DROP COLUMN IF EXISTS period_start_date,
  DROP COLUMN IF EXISTS period_end_date,
  DROP COLUMN IF EXISTS period_frequency,
  DROP COLUMN IF EXISTS period_type;

-- 3. Eliminar campos de bloqueo (innecesarios)
ALTER TABLE user_payrolls
  DROP COLUMN IF EXISTS is_locked,
  DROP COLUMN IF EXISTS locked_at,
  DROP COLUMN IF EXISTS locked_by;

-- 4. Recrear políticas sin validación de is_locked
CREATE POLICY "user_payrolls_update" ON public.user_payrolls FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

CREATE POLICY "user_payrolls_delete" ON public.user_payrolls FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- Comentario explicativo
COMMENT ON TABLE user_payrolls IS 'Nóminas individuales de usuarios. Los datos de período vienen de company_payment_periods mediante company_payment_period_id';