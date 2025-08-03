-- Complete fix for the security_definer_view issue
-- Drop the view entirely and recreate it with proper security settings

-- First, drop the problematic view completely
DROP VIEW IF EXISTS public.loads_complete CASCADE;

-- Recreate the view with explicit INVOKER rights (opposite of SECURITY DEFINER)
-- This ensures it uses the permissions of the user running the query
CREATE VIEW public.loads_complete 
WITH (security_invoker = true) AS
SELECT 
    loads.id,
    loads.load_number,
    loads.driver_user_id,
    loads.total_amount,
    loads.currency,
    loads.factoring_percentage,
    loads.dispatching_percentage,
    loads.leasing_percentage,
    loads.status,
    loads.customer_name,
    loads.client_id,
    loads.commodity,
    loads.weight_lbs,
    loads.notes,
    loads.created_at,
    loads.updated_at,
    loads.created_by,
    loads.payment_period_id,
    loads.internal_dispatcher_id,
    loads.pickup_date,
    loads.delivery_date,
    loads.client_contact_id,
    loads.po_number,
    'active'::text AS data_source
FROM loads

UNION ALL

SELECT 
    loads_archive.id,
    loads_archive.load_number,
    loads_archive.driver_user_id,
    loads_archive.total_amount,
    loads_archive.currency,
    loads_archive.factoring_percentage,
    loads_archive.dispatching_percentage,
    loads_archive.leasing_percentage,
    loads_archive.status,
    loads_archive.customer_name,
    loads_archive.client_id,
    loads_archive.commodity,
    loads_archive.weight_lbs,
    loads_archive.notes,
    loads_archive.created_at,
    loads_archive.updated_at,
    loads_archive.created_by,
    loads_archive.payment_period_id,
    loads_archive.internal_dispatcher_id,
    loads_archive.pickup_date,
    loads_archive.delivery_date,
    loads_archive.client_contact_id,
    loads_archive.po_number,
    'archived'::text AS data_source
FROM loads_archive;

-- Grant only necessary permissions to authenticated users
GRANT SELECT ON public.loads_complete TO authenticated;

-- Ensure proper ownership (should be postgres by default, but let's be explicit)
ALTER VIEW public.loads_complete OWNER TO postgres;