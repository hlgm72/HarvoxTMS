-- Primero, consultar la política actual de system_alerts para ver su estructura
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'system_alerts' AND policyname = 'system_alerts_superadmin_only';