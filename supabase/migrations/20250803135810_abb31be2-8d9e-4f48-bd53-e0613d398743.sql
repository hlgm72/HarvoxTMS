-- Remove duplicate foreign key constraint to fix PostgREST ambiguity error
-- Keep the original constraint and remove the duplicate one we added

ALTER TABLE public.user_company_roles 
DROP CONSTRAINT IF EXISTS fk_user_company_roles_company;

-- The original constraint user_company_roles_company_id_fkey should remain