-- Fix Security Definer View issue
-- Drop and recreate the view without SECURITY DEFINER

-- Drop the existing SECURITY DEFINER view
DROP VIEW IF EXISTS public.loads_complete;

-- Create the view without SECURITY DEFINER 
-- This will use the RLS policies of the querying user instead of bypassing them
CREATE VIEW public.loads_complete AS
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