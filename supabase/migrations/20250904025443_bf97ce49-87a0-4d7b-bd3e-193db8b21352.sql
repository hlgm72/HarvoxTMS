-- Fix the generate_load_percentage_deductions function to use correct column name
-- The error shows it's trying to use 'driver_user_id' instead of 'user_id' in expense_instances table

CREATE OR REPLACE FUNCTION public.generate_load_percentage_deductions(load_id_param uuid DEFAULT NULL, period_calculation_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    period_record RECORD;
    driver_id UUID;
    total_dispatching NUMERIC := 0;
    total_factoring NUMERIC := 0;
    total_leasing NUMERIC := 0;
    dispatching_expense_type_id UUID := '9e5a38ae-8851-4a8c-9bc7-11ac32cb7b10';
    factoring_expense_type_id UUID := '1a3355f5-1a3b-49d6-89b4-acc7f259ebdb';
    leasing_expense_type_id UUID := '28d59af7-c756-40bf-885e-fb995a744003';
BEGIN
    -- Get driver and period information
    SELECT 
        dpc.driver_user_id,
        cpp.period_start_date,
        cpp.period_end_date,
        cpp.id as company_payment_period_id
    INTO driver_id, period_record
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE dpc.id = period_calculation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Period calculation not found';
    END IF;

    -- Calculate total deductions from completed loads in this period
    SELECT 
        COALESCE(SUM(l.total_amount * COALESCE(l.dispatching_percentage, 0) / 100), 0),
        COALESCE(SUM(l.total_amount * COALESCE(l.factoring_percentage, 0) / 100), 0),
        COALESCE(SUM(l.total_amount * COALESCE(l.leasing_percentage, 0) / 100), 0)
    INTO total_dispatching, total_factoring, total_leasing
    FROM loads l
    WHERE l.driver_user_id = driver_id
    AND l.payment_period_id = period_record.company_payment_period_id
    AND l.status = 'completed';

    -- Insert or update Leasing Fee deduction
    IF total_leasing > 0 THEN
        INSERT INTO expense_instances (
          payment_period_id,
          expense_type_id,
          user_id,  -- FIXED: use user_id instead of driver_user_id
          amount,
          description,
          expense_date,
          status,
          created_by,
          applied_by,
          applied_at
        ) VALUES (
          period_calculation_id,
          leasing_expense_type_id,
          driver_id,
          total_leasing,
          'Leasing fees from loads',
          period_record.period_end_date,
          'applied',
          auth.uid(),
          auth.uid(),
          now()
        )
        ON CONFLICT (payment_period_id, expense_type_id, user_id)  -- FIXED: use user_id
        DO UPDATE SET 
          amount = total_leasing,
          description = 'Leasing fees from loads',
          updated_at = now();
    END IF;

    -- Insert or update Factoring Fee deduction
    IF total_factoring > 0 THEN
        INSERT INTO expense_instances (
          payment_period_id,
          expense_type_id,
          user_id,  -- FIXED: use user_id instead of driver_user_id
          amount,
          description,
          expense_date,
          status,
          created_by,
          applied_by,
          applied_at
        ) VALUES (
          period_calculation_id,
          factoring_expense_type_id,
          driver_id,
          total_factoring,
          'Factoring fees from loads',
          period_record.period_end_date,
          'applied',
          auth.uid(),
          auth.uid(),
          now()
        )
        ON CONFLICT (payment_period_id, expense_type_id, user_id)  -- FIXED: use user_id
        DO UPDATE SET 
          amount = total_factoring,
          description = 'Factoring fees from loads',
          updated_at = now();
    END IF;

    -- Insert or update Dispatching Fee deduction
    IF total_dispatching > 0 THEN
        INSERT INTO expense_instances (
          payment_period_id,
          expense_type_id,
          user_id,  -- FIXED: use user_id instead of driver_user_id
          amount,
          description,
          expense_date,
          status,
          created_by,
          applied_by,
          applied_at
        ) VALUES (
          period_calculation_id,
          dispatching_expense_type_id,
          driver_id,
          total_dispatching,
          'Dispatching fees from loads',
          period_record.period_end_date,
          'applied',
          auth.uid(),
          auth.uid(),
          now()
        )
        ON CONFLICT (payment_period_id, expense_type_id, user_id)  -- FIXED: use user_id
        DO UPDATE SET 
          amount = total_dispatching,
          description = 'Dispatching fees from loads',
          updated_at = now();
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'period_calculation_id', period_calculation_id,
        'driver_id', driver_id,
        'deductions', jsonb_build_object(
            'dispatching', total_dispatching,
            'factoring', total_factoring,
            'leasing', total_leasing
        )
    );

END;
$function$;