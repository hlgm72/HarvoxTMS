
-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- Also ensure the function is properly registered
COMMENT ON FUNCTION public.update_load_status_with_validation(uuid, text) IS 'Updates load status with validation and history tracking';
