-- Corregir transacciones de combustible existentes que no incluyan fees en el total
-- Actualizar total_amount = gross_amount + fees - discount_amount para transacciones incorrectas

UPDATE fuel_expenses 
SET 
  total_amount = gross_amount + COALESCE(fees, 0) - COALESCE(discount_amount, 0),
  updated_at = now()
WHERE 
  -- Solo actualizar transacciones donde el cálculo está incorrecto
  ABS(total_amount - (gross_amount + COALESCE(fees, 0) - COALESCE(discount_amount, 0))) > 0.01
  -- Enfocar en transacciones recientes para evitar actualizar demasiadas
  AND transaction_date >= '2025-07-01';

-- Log de las transacciones actualizadas para auditoría
INSERT INTO archive_logs (
  operation_type,
  table_name,
  details,
  records_affected,
  triggered_by
)
SELECT 
  'UPDATE',
  'fuel_expenses',
  jsonb_build_object(
    'reason', 'Corregir cálculo de total_amount para incluir fees',
    'formula', 'total_amount = gross_amount + fees - discount_amount',
    'date_range', 'Desde 2025-07-01'
  ),
  (SELECT COUNT(*) 
   FROM fuel_expenses 
   WHERE ABS(total_amount - (gross_amount + COALESCE(fees, 0) - COALESCE(discount_amount, 0))) > 0.01
   AND transaction_date >= '2025-07-01'),
  'system_data_correction';