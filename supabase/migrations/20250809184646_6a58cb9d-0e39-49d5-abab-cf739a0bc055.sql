-- Limpiar registros huérfanos en other_income
-- Eliminar registros que referencian payment_period_id inexistentes

DELETE FROM public.other_income 
WHERE NOT EXISTS (
  SELECT 1 FROM driver_period_calculations dpc 
  WHERE dpc.id = other_income.payment_period_id
);

-- Verificar que se eliminaron los registros correctos
-- (Esta query no eliminará nada, solo mostrará el resultado)
SELECT 'Registros huérfanos eliminados' as resultado;