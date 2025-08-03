-- Remove compatibility views since all code has been updated to use consolidated structure
-- These views were causing security issues with SECURITY DEFINER

DROP VIEW IF EXISTS public.company_drivers_view CASCADE;
DROP VIEW IF EXISTS public.company_dispatchers_view CASCADE;

-- Update system stats to reflect view cleanup
UPDATE public.system_stats 
SET stat_value = stat_value || jsonb_build_object(
  'views_cleaned_up', true,
  'removed_views', ARRAY['company_drivers_view', 'company_dispatchers_view'],
  'cleanup_completed_at', now()
)
WHERE stat_type = 'table_consolidation';