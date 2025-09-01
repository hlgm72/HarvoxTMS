-- Verificar la función simple_load_operation actual
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'simple_load_operation' 
AND routine_schema = 'public';