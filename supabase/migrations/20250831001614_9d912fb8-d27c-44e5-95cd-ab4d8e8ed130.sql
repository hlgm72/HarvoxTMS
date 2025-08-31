-- =================================================================
-- LIMPIEZA DE PERÍODOS FUTUROS INNECESARIOS
-- =================================================================
-- 
-- Eliminamos períodos posteriores a la semana 34 de 2025 (después del 31 de agosto 2025)
-- que solo contienen deducciones recurrentes automáticas y no tienen datos reales de negocio
-- 
-- Esto está alineado con nuestro sistema de períodos bajo demanda v2.0
-- Los períodos se recrearán automáticamente cuando sean realmente necesarios

-- PASO 1: Eliminar dependencias en orden correcto

-- 1.1 Eliminar driver_period_calculations de períodos futuros
DELETE FROM driver_period_calculations 
WHERE company_payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE period_start_date > '2025-08-31'
);

-- 1.2 Eliminar expense_instances (deducciones recurrentes) de períodos futuros
DELETE FROM expense_instances 
WHERE payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE period_start_date > '2025-08-31'
);

-- 1.3 Eliminar cualquier otro registro dependiente que pueda existir
DELETE FROM fuel_expenses 
WHERE payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE period_start_date > '2025-08-31'
);

DELETE FROM other_income 
WHERE payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE period_start_date > '2025-08-31'
);

-- 1.4 Actualizar cualquier load que tenga referencia a estos períodos (debe ser 0 según nuestra consulta)
UPDATE loads 
SET payment_period_id = NULL 
WHERE payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE period_start_date > '2025-08-31'
);

-- PASO 2: Eliminar los períodos de pago futuros innecesarios
DELETE FROM company_payment_periods 
WHERE period_start_date > '2025-08-31';

-- PASO 3: Logging para auditoría
INSERT INTO archive_logs (
  table_name,
  operation_type,
  details,
  triggered_by,
  status
) VALUES (
  'company_payment_periods',
  'CLEANUP_FUTURE_PERIODS',
  jsonb_build_object(
    'reason', 'Eliminación de períodos futuros innecesarios posteriores a semana 34 de 2025',
    'cutoff_date', '2025-08-31',
    'justification', 'Períodos solo contenían deducciones recurrentes automáticas, sin datos reales de negocio',
    'system_version', 'v2.0 - Períodos Bajo Demanda',
    'date_range_eliminated', 'Septiembre 2025 en adelante'
  ),
  'SYSTEM_CLEANUP',
  'completed'
);