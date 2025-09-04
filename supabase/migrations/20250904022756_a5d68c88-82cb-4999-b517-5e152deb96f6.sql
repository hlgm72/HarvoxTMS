-- Drop the old simple_load_operation function that may have company_id references
DROP FUNCTION IF EXISTS public.simple_load_operation(jsonb, jsonb[], uuid);