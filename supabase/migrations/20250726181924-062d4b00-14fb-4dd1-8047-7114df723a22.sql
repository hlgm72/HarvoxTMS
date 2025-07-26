-- Fix remaining functions with mutable search_path
-- These are the functions created in the security fixes that need search_path set

-- Fix prevent_self_superadmin_assignment function
ALTER FUNCTION public.prevent_self_superadmin_assignment() SET search_path TO 'public';

-- Fix log_role_changes function  
ALTER FUNCTION public.log_role_changes() SET search_path TO 'public';