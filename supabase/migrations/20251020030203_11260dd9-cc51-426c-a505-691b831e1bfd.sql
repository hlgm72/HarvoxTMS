-- Eliminar instancias duplicadas de plantillas mensuales
-- Mantener solo la primera instancia de cada mes para cada plantilla

WITH monthly_instances AS (
  SELECT 
    ei.id,
    ei.recurring_template_id,
    ei.user_id,
    date_trunc('month', cpp.period_start_date) as expense_month,
    ei.expense_date,
    ert.month_week as template_week,
    get_week_of_month(cpp.period_start_date) as period_week,
    ROW_NUMBER() OVER (
      PARTITION BY ei.recurring_template_id, ei.user_id, date_trunc('month', cpp.period_start_date)
      ORDER BY ei.expense_date ASC, ei.created_at ASC
    ) as rn
  FROM expense_instances ei
  JOIN expense_recurring_templates ert ON ei.recurring_template_id = ert.id
  JOIN company_payment_periods cpp ON ei.payment_period_id = cpp.id
  WHERE ert.frequency = 'monthly'
  AND ert.month_week IS NOT NULL
  AND ei.created_at >= '2025-01-01'::date
),
instances_to_delete AS (
  SELECT id
  FROM monthly_instances
  WHERE rn > 1  -- Mantener solo la primera instancia de cada mes
)
DELETE FROM expense_instances
WHERE id IN (SELECT id FROM instances_to_delete);

-- Log de la limpieza
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate monthly expense instances', deleted_count;
END $$;