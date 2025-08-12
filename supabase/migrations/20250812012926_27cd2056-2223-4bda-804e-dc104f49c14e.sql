-- Deshabilitar TODOS los triggers relacionados con recálculos automáticos
DROP TRIGGER IF EXISTS trigger_loads_update_recalculate_deductions ON loads;
DROP TRIGGER IF EXISTS trigger_loads_delete_recalculate_deductions ON loads;
DROP TRIGGER IF EXISTS trigger_fuel_expenses_recalculate ON fuel_expenses;
DROP TRIGGER IF EXISTS trigger_expense_instances_recalculate ON expense_instances;

-- Corregir manualmente las ciudades con UUIDs sin activar triggers
SET session_replication_role = replica;

UPDATE load_stops 
SET city = 'Houston' 
WHERE city = '750b5c34-e64e-493f-bfd6-2e41f640dd6f';

UPDATE load_stops 
SET city = 'Fort Worth' 
WHERE city = 'b0054329-2b61-4899-ba65-3b5e3d19c59f';

-- Cambiar cualquier otro UUID por un texto genérico
UPDATE load_stops 
SET city = 'Ciudad pendiente' 
WHERE city ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
AND city NOT IN ('Houston', 'Fort Worth');

SET session_replication_role = DEFAULT;