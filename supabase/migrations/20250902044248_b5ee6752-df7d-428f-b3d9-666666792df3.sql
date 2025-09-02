-- Remove incorrectly applied recurring deductions from period 35
-- These were applied due to faulty date logic in the period creation function

-- First, let's identify and delete the incorrectly applied Loadboard Subscription
-- that starts September 1st but was applied to period ending August 31st
DELETE FROM expense_instances 
WHERE id IN (
  SELECT ei.id 
  FROM expense_instances ei
  JOIN expense_types et ON ei.expense_type_id = et.id
  JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  LEFT JOIN expense_recurring_templates ert ON ei.recurring_template_id = ert.id
  WHERE cpp.id = '39eee0b0-ef5c-4f2f-98fd-508a7269b885' -- Period 35
    AND et.name = 'Loadboard Subscription'
    AND ei.amount = 80.00
    AND ei.description = 'Suscripciones a plataformas de carga (DAT, Truckstop, Sylectus, etc.)'
    -- This deduction starts September 1st, so it shouldn't be in August period
    AND EXISTS (
      SELECT 1 FROM expense_recurring_templates ert2 
      WHERE ert2.expense_type_id = et.id 
      AND ert2.user_id = ei.user_id 
      AND ert2.start_date > cpp.period_end_date
    )
);

-- Also remove any other recurring deductions that were incorrectly applied
-- (those with start dates after the period end date)
DELETE FROM expense_instances 
WHERE id IN (
  SELECT ei.id 
  FROM expense_instances ei
  JOIN expense_types et ON ei.expense_type_id = et.id
  JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  JOIN expense_recurring_templates ert ON ei.recurring_template_id = ert.id
  WHERE cpp.id = '39eee0b0-ef5c-4f2f-98fd-508a7269b885' -- Period 35
    AND ert.start_date > cpp.period_end_date -- Deduction starts after period ends
    AND et.category NOT IN ('percentage_deduction') -- Don't touch load-based deductions
);