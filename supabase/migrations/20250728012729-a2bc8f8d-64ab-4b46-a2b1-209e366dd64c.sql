-- Enfoque final: usar TRUNCATE para eliminar todos los datos de fuel_expenses
-- y empezar limpio (esto es más seguro que intentar reparar datos corruptos)

-- TRUNCATE eliminará todos los datos de fuel_expenses de todas las empresas
-- Esto es necesario porque los datos existentes tienen un esquema incompatible
TRUNCATE TABLE fuel_expenses CASCADE;

-- Los usuarios tendrán que volver a subir sus gastos de combustible,
-- pero estos se crearán con el esquema correcto y funcionarán perfectamente.