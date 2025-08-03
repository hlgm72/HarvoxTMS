-- FINAL STEP: Remove obsolete tables after code has been updated

-- Drop the redundant tables now that all functionality has been moved to consolidated structure
DROP TABLE IF EXISTS public.company_drivers CASCADE;
DROP TABLE IF EXISTS public.company_dispatchers CASCADE;

-- Keep the views temporarily for any remaining backwards compatibility
-- Views will be cleaned up in a future migration once all references are confirmed updated

-- Log the successful consolidation
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('table_consolidation', jsonb_build_object(
  'consolidated_at', now(),
  'removed_tables', ARRAY['company_drivers', 'company_dispatchers'],
  'consolidated_into', 'user_company_roles',
  'migration_completed', true
));