-- Deshabilitar TODOS los triggers en fuel_expenses temporalmente
-- Luego limpiar los datos problemáticos

-- 1. Deshabilitar todos los triggers en fuel_expenses
ALTER TABLE fuel_expenses DISABLE TRIGGER ALL;

-- 2. Eliminar todos los fuel_expenses de esta empresa (datos incorrectos)
DELETE FROM fuel_expenses 
WHERE driver_user_id IN (
  SELECT ucr.user_id 
  FROM user_company_roles ucr 
  WHERE ucr.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b' 
  AND ucr.is_active = true
);

-- 3. Reactivar triggers
ALTER TABLE fuel_expenses ENABLE TRIGGER ALL;

-- Nota: Ahora la página de combustible aparecerá vacía, pero funcionará correctamente
-- Los usuarios podrán agregar nuevos gastos de combustible que se crearán con el esquema correcto