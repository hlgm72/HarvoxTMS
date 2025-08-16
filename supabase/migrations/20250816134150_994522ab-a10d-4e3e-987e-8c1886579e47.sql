-- SOLUCIÓN DEFINITIVA: Crear TODOS los índices faltantes para foreign keys
-- SIN eliminar los que aparecen como "unused"

-- driver_period_calculations.paid_by (columna 18)
CREATE INDEX IF NOT EXISTS idx_driver_period_calculations_paid_by 
ON public.driver_period_calculations(paid_by);

-- driver_profiles.license_state (columna 4)  
CREATE INDEX IF NOT EXISTS idx_driver_profiles_license_state 
ON public.driver_profiles(license_state);

-- expense_instances.expense_type_id (columna 3)
CREATE INDEX IF NOT EXISTS idx_expense_instances_expense_type_id 
ON public.expense_instances(expense_type_id);

-- expense_template_history.template_id (columna 2)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_template_history') THEN
    CREATE INDEX IF NOT EXISTS idx_expense_template_history_template_id 
    ON public.expense_template_history(template_id);
  END IF;
END $$;

-- fuel_expenses.vehicle_id (columna 12)
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_vehicle_id 
ON public.fuel_expenses(vehicle_id);

-- loads.broker_dispatcher_id (columna 24)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loads' AND column_name = 'broker_dispatcher_id') THEN
    CREATE INDEX IF NOT EXISTS idx_loads_broker_dispatcher_id 
    ON public.loads(broker_dispatcher_id);
  END IF;
END $$;

-- payment_methods.company_id (columna 2)
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id 
ON public.payment_methods(company_id);

-- user_invitations.accepted_by (columna 9)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_invitations') THEN
    CREATE INDEX IF NOT EXISTS idx_user_invitations_accepted_by 
    ON public.user_invitations(accepted_by);
  END IF;
END $$;

-- user_invitations.target_user_id (columna 17)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_invitations') THEN
    CREATE INDEX IF NOT EXISTS idx_user_invitations_target_user_id 
    ON public.user_invitations(target_user_id);
  END IF;
END $$;