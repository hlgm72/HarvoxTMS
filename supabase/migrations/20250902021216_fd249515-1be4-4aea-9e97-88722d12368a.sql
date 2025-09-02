-- Limpiar período huérfano de la semana 36 que se creó por error
DELETE FROM company_payment_periods 
WHERE id = '17d84bb9-aa99-4342-8c1f-c0c7a61b2b58'
  AND company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  -- Solo eliminar si no tiene datos asociados
  AND NOT EXISTS (
    SELECT 1 FROM driver_period_calculations 
    WHERE company_payment_period_id = '17d84bb9-aa99-4342-8c1f-c0c7a61b2b58'
  );