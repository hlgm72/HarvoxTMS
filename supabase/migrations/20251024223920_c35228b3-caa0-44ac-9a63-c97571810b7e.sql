
-- Ejecutar manualmente el recálculo de deducciones de porcentaje
SELECT recalculate_period_percentage_deductions(
  'becd3770-526a-41cc-8e1e-eb35764c90ac',
  '087a825c-94ea-42d9-8388-5087a19d776f'
);

-- Ver las deducciones después del recálculo
SELECT 
  ei.amount,
  et.name as expense_type_name
FROM expense_instances ei
JOIN expense_types et ON et.id = ei.expense_type_id
WHERE ei.user_id = '087a825c-94ea-42d9-8388-5087a19d776f'
  AND ei.payment_period_id = 'becd3770-526a-41cc-8e1e-eb35764c90ac'
  AND et.category = 'percentage_deduction'
ORDER BY et.name;
