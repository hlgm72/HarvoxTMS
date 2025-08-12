-- Corregir manualmente las ciudades con UUIDs específicos
UPDATE load_stops 
SET city = 'Houston' 
WHERE city = '750b5c34-e64e-493f-bfd6-2e41f640dd6f';

UPDATE load_stops 
SET city = 'Fort Worth' 
WHERE city = 'b0054329-2b61-4899-ba65-3b5e3d19c59f';

-- Verificar si hay otros UUIDs y marcarlos para revisión
UPDATE load_stops 
SET city = 'Ciudad por verificar' 
WHERE city ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
AND city NOT IN ('Houston', 'Fort Worth');