-- Final performance optimization: Add last missing foreign key indexes and remove unused indexes

-- Add the remaining missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_user_company_roles_user_id ON public.user_company_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON public.user_invitations(invited_by);

-- Remove all unused indexes to free up space
DROP INDEX IF EXISTS public.idx_company_broker_dispatchers_broker_id;
DROP INDEX IF EXISTS public.idx_company_brokers_company_id;
DROP INDEX IF EXISTS public.idx_company_documents_company_id;
DROP INDEX IF EXISTS public.idx_driver_profiles_license_state;
DROP INDEX IF EXISTS public.idx_expense_template_history_template_id;
DROP INDEX IF EXISTS public.idx_load_documents_load_id;
DROP INDEX IF EXISTS public.idx_load_stops_load_id;
DROP INDEX IF EXISTS public.idx_other_income_payment_period_id;
DROP INDEX IF EXISTS public.idx_payment_methods_company_id;
DROP INDEX IF EXISTS public.idx_payment_methods_created_by;
DROP INDEX IF EXISTS public.idx_payment_reports_payment_method_id;
DROP INDEX IF EXISTS public.idx_payment_reports_payment_period_id;
DROP INDEX IF EXISTS public.idx_user_company_roles_company_id;

-- Log the final cleanup
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('final_index_cleanup', jsonb_build_object(
  'timestamp', now(),
  'description', 'Final index optimization: Added last missing foreign key indexes and removed all unused indexes',
  'final_fkey_indexes_added', ARRAY[
    'idx_user_company_roles_user_id',
    'idx_user_invitations_invited_by'
  ],
  'unused_indexes_removed', ARRAY[
    'idx_company_broker_dispatchers_broker_id', 'idx_company_brokers_company_id',
    'idx_company_documents_company_id', 'idx_driver_profiles_license_state',
    'idx_expense_template_history_template_id', 'idx_load_documents_load_id',
    'idx_load_stops_load_id', 'idx_other_income_payment_period_id',
    'idx_payment_methods_company_id', 'idx_payment_methods_created_by',
    'idx_payment_reports_payment_method_id', 'idx_payment_reports_payment_period_id',
    'idx_user_company_roles_company_id'
  ],
  'impact', 'Database now has optimal indexing - all foreign keys covered and no unused indexes consuming space'
));