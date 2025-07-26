-- Security Fix: Set immutable search_path for all database functions
-- This prevents SQL injection attacks through search_path manipulation

-- Update existing functions to have immutable search_path
ALTER FUNCTION public.generate_recurring_expenses_for_period(uuid) SET search_path TO 'public';
ALTER FUNCTION public.calculate_driver_payment_period(uuid) SET search_path TO 'public';
ALTER FUNCTION public.archive_company_document(uuid) SET search_path TO 'public';
ALTER FUNCTION public.restore_company_document(uuid) SET search_path TO 'public';
ALTER FUNCTION public.generate_payment_periods(uuid, timestamp with time zone, timestamp with time zone) SET search_path TO 'public';
ALTER FUNCTION public.assign_payment_period_to_load() SET search_path TO 'public';
ALTER FUNCTION public.validate_reset_token(text) SET search_path TO 'public';
ALTER FUNCTION public.use_reset_token(text) SET search_path TO 'public';
ALTER FUNCTION public.cleanup_expired_reset_tokens() SET search_path TO 'public';
ALTER FUNCTION public.has_role(uuid, user_role) SET search_path TO 'public';
ALTER FUNCTION public.handle_load_stops_company_assignment() SET search_path TO 'public';
ALTER FUNCTION public.maintenance_cleanup() SET search_path TO 'public';
ALTER FUNCTION public.calculate_fuel_summary_for_period(uuid) SET search_path TO 'public';
ALTER FUNCTION public.lock_payment_period(uuid, text, text) SET search_path TO 'public';
ALTER FUNCTION public.is_period_locked(uuid) SET search_path TO 'public';
ALTER FUNCTION public.delete_company_document_permanently(uuid) SET search_path TO 'public';
ALTER FUNCTION public.report_payment_and_lock(uuid, uuid, numeric, text, text) SET search_path TO 'public';
ALTER FUNCTION public.create_first_superadmin(text, text, text, text) SET search_path TO 'public';
ALTER FUNCTION public.process_company_payment_period(uuid) SET search_path TO 'public';
ALTER FUNCTION public.get_user_company_roles(uuid) SET search_path TO 'public';
ALTER FUNCTION public.inherit_owner_operator_percentages() SET search_path TO 'public';
ALTER FUNCTION public.generate_payment_periods(uuid, date, date) SET search_path TO 'public';
ALTER FUNCTION public.auto_assign_payment_period_on_load_update() SET search_path TO 'public';
ALTER FUNCTION public.is_superadmin(uuid) SET search_path TO 'public';
ALTER FUNCTION public.validate_invitation_token(text) SET search_path TO 'public';
ALTER FUNCTION public.get_real_companies() SET search_path TO 'public';
ALTER FUNCTION public.reassign_to_payment_period(text, uuid, uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.get_payment_period_elements(uuid) SET search_path TO 'public';
ALTER FUNCTION public.update_payment_period_on_date_change() SET search_path TO 'public';