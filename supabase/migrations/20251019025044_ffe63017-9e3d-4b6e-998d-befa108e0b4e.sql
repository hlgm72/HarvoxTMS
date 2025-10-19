-- Corregir función fix_payment_period_calculations_safe para eliminar referencia a is_locked
CREATE OR REPLACE FUNCTION public.fix_payment_period_calculations_safe()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  calc_record RECORD;
  fixed_count INTEGER := 0;
  error_count INTEGER := 0;
  result JSONB;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND role = 'superadmin'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Solo superadmins pueden ejecutar esta función';
  END IF;
  
  -- ✅ REMOVIDO: cpp.is_locked = false
  FOR calc_record IN 
    SELECT upp.id, upp.user_id, upp.company_payment_period_id
    FROM user_payrolls upp
    JOIN company_payment_periods cpp ON upp.company_payment_period_id = cpp.id
    WHERE upp.gross_earnings = 0 
      AND upp.fuel_expenses = 0 
      AND upp.total_deductions = 0 
      AND upp.other_income = 0
      AND upp.payment_status != 'paid'
      AND cpp.created_at >= CURRENT_DATE - INTERVAL '30 days'
  LOOP
    BEGIN
      PERFORM calculate_user_payment_period_with_validation(calc_record.id);
      fixed_count := fixed_count + 1;
      
      RAISE NOTICE 'Fixed calculation % for user %', 
        calc_record.id, calc_record.user_id;
        
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE NOTICE 'Error fixing calculation %: %', 
        calc_record.id, SQLERRM;
    END;
  END LOOP;
  
  result := jsonb_build_object(
    'success', true,
    'fixed_calculations', fixed_count,
    'error_count', error_count,
    'execution_time', now(),
    'executed_by', current_user_id,
    'message', format('Se corrigieron %s cálculos con %s errores', fixed_count, error_count)
  );
  
  RETURN result;
END;
$function$;