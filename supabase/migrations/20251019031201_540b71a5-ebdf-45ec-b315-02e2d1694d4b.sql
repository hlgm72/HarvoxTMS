
-- 🔥 ELIMINAR TODAS LAS FUNCIONES OBSOLETAS QUE REFERENCIAN driver_period_calculations
-- Este es el problema raíz de los errores persistentes

DO $$ 
BEGIN
  -- Hacer DROP CASCADE de todas las funciones problemáticas
  DROP FUNCTION IF EXISTS public.apply_automatic_deductions(uuid, uuid, numeric, numeric, numeric, numeric, date) CASCADE;
  DROP FUNCTION IF EXISTS public.generate_load_percentage_deductions(uuid, uuid) CASCADE;
  DROP FUNCTION IF EXISTS public.recalculate_payment_period_totals(uuid) CASCADE;
  DROP FUNCTION IF EXISTS public.verify_and_recalculate_company_payments(uuid) CASCADE;
  DROP FUNCTION IF EXISTS public.mark_driver_as_paid(uuid, text, text, text) CASCADE;
  DROP FUNCTION IF EXISTS public.calculate_driver_payment_period_with_validation(uuid) CASCADE;
  
  RAISE NOTICE 'Funciones obsoletas eliminadas. El sistema ahora usa user_payrolls exclusivamente.';
  RAISE NOTICE 'Las deducciones automáticas se manejan con recalculate_period_percentage_deductions()';
  RAISE NOTICE 'Los cálculos de pago se manejan con calculate_user_payment_period_with_validation()';
END $$;
