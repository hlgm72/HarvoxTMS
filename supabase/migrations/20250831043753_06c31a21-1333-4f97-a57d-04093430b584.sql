-- Borrar períodos innecesarios de forma segura

-- PASO 1: Borrar primero los driver_period_calculations asociados
DELETE FROM driver_period_calculations 
WHERE company_payment_period_id IN (
  '9bf06e22-fdc2-42ea-bc9f-a7121dce4862',  -- Semana 35
  'b9ba4787-5b9d-4396-8ef5-2ff08e426353',  -- Semana 36  
  'b60b6027-cb73-4e3a-8a30-bec681587432'   -- Semana 37
);

-- PASO 2: Borrar expense_instances asociadas (si las hay)
DELETE FROM expense_instances 
WHERE payment_period_id IN (
  SELECT id FROM driver_period_calculations 
  WHERE company_payment_period_id IN (
    '9bf06e22-fdc2-42ea-bc9f-a7121dce4862',
    'b9ba4787-5b9d-4396-8ef5-2ff08e426353',
    'b60b6027-cb73-4e3a-8a30-bec681587432'
  )
);

-- PASO 3: Ahora borrar los períodos innecesarios
DELETE FROM company_payment_periods 
WHERE id IN (
  '9bf06e22-fdc2-42ea-bc9f-a7121dce4862',  -- Semana 35 (2025-08-25 a 2025-08-31)
  'b9ba4787-5b9d-4396-8ef5-2ff08e426353',  -- Semana 36 (2025-09-01 a 2025-09-07)
  'b60b6027-cb73-4e3a-8a30-bec681587432'   -- Semana 37 (2025-09-08 a 2025-09-14)
);

-- PASO 4: Registrar la limpieza en el sistema de alertas
INSERT INTO system_alerts (
  alert_type,
  message,
  company_id,
  resolved,
  resolved_at
) VALUES (
  'MASS_PERIOD_CLEANUP',
  'Eliminados 3 períodos innecesarios (semanas 35, 36, 37) creados por error de triggers',
  'e5d52767-ca59-4c28-94e4-058aff6a037b',
  true,
  now()
);