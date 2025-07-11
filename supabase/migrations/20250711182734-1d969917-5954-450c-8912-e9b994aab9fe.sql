-- Add missing foreign key indexes for companies table

-- Create indexes for foreign keys in companies table
CREATE INDEX IF NOT EXISTS idx_companies_city_id ON public.companies(city_id);
CREATE INDEX IF NOT EXISTS idx_companies_state_id ON public.companies(state_id);

-- Verify and ensure all foreign key relationships have proper indexes
-- Check if there are any other missing indexes for frequently accessed foreign keys
CREATE INDEX IF NOT EXISTS idx_user_company_roles_company_id ON public.user_company_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_company_roles_user_id ON public.user_company_roles(user_id);

-- Log the foreign key index creation
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('missing_foreign_key_indexes_fixed', jsonb_build_object(
  'timestamp', now(),
  'description', 'Created missing foreign key indexes for companies and user_company_roles tables',
  'indexes_created', ARRAY[
    'idx_companies_city_id',
    'idx_companies_state_id', 
    'idx_user_company_roles_company_id',
    'idx_user_company_roles_user_id'
  ],
  'impact', 'Resolved unindexed foreign key warnings for companies table'
));