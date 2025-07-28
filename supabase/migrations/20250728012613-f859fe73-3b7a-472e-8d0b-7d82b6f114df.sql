-- Solución directa: eliminar los datos de combustible con payment_period_id incorrectos
-- Es mejor tener datos vacíos que datos que causan errores en el sistema

-- Eliminar todos los fuel_expenses de esta empresa que tienen payment_period_id incorrectos
DELETE FROM fuel_expenses 
WHERE driver_user_id IN (
  SELECT ucr.user_id 
  FROM user_company_roles ucr 
  WHERE ucr.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b' 
  AND ucr.is_active = true
)
AND payment_period_id NOT IN (
  SELECT dpc.id 
  FROM driver_period_calculations dpc 
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE cpp.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
);

-- Verificar que quedaron solo los datos correctos (debería ser 0 registros inicialmente)
-- Los usuarios podrán agregar nuevos gastos de combustible que se crearán con los IDs correctos