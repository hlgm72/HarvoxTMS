-- Fix missing RLS policies for critical business data tables
-- Handle views and tables separately

-- 1. Fix password_reset_tokens table to be service role only
-- Remove any user-accessible policies and restrict to service role only
DROP POLICY IF EXISTS "password_reset_tokens_deny_all_users" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "password_reset_tokens_service_only" ON public.password_reset_tokens;

-- Create strict service role only policy
CREATE POLICY "password_reset_tokens_service_only" ON public.password_reset_tokens
FOR ALL USING (
  current_setting('app.service_operation', true) = 'allowed'
) WITH CHECK (
  current_setting('app.service_operation', true) = 'allowed'
);

-- 2. Create optimized RLS policies for system tables (superadmin only access)
-- These tables contain operational data that should only be accessible to superadmins

-- System backups table (if it exists as a table)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_backups' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "system_backups_superadmin_only" ON public.system_backups;
    ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;
    
    EXECUTE 'CREATE POLICY "system_backups_superadmin_only" ON public.system_backups
    FOR ALL USING (
      (SELECT auth.role()) = ''authenticated'' AND
      (SELECT auth.uid()) IS NOT NULL AND
      COALESCE(((SELECT auth.jwt())->>''is_anonymous'')::boolean, false) = false AND
      is_user_superadmin_safe((SELECT auth.uid()))
    ) WITH CHECK (
      (SELECT auth.role()) = ''authenticated'' AND
      (SELECT auth.uid()) IS NOT NULL AND
      COALESCE(((SELECT auth.jwt())->>''is_anonymous'')::boolean, false) = false AND
      is_user_superadmin_safe((SELECT auth.uid()))
    )';
  END IF;
END $$;

-- System health log table (if it exists as a table)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_health_log' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "system_health_log_superadmin_only" ON public.system_health_log;
    ALTER TABLE public.system_health_log ENABLE ROW LEVEL SECURITY;
    
    EXECUTE 'CREATE POLICY "system_health_log_superadmin_only" ON public.system_health_log
    FOR ALL USING (
      (SELECT auth.role()) = ''authenticated'' AND
      (SELECT auth.uid()) IS NOT NULL AND
      COALESCE(((SELECT auth.jwt())->>''is_anonymous'')::boolean, false) = false AND
      is_user_superadmin_safe((SELECT auth.uid()))
    ) WITH CHECK (
      (SELECT auth.role()) = ''authenticated'' AND
      (SELECT auth.uid()) IS NOT NULL AND
      COALESCE(((SELECT auth.jwt())->>''is_anonymous'')::boolean, false) = false AND
      is_user_superadmin_safe((SELECT auth.uid()))
    )';
  END IF;
END $$;

-- 3. Create helper functions (if not exists)
CREATE OR REPLACE FUNCTION public.is_user_superadmin_safe(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_company_roles
    WHERE user_id = user_id_param
    AND role = 'superadmin'
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_user_admin_in_company_safe(user_id_param uuid, company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_company_roles
    WHERE user_id = user_id_param
    AND company_id = company_id_param
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_ids_safe(user_id_param uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ARRAY_AGG(company_id)
  FROM user_company_roles
  WHERE user_id = user_id_param
  AND is_active = true;
$$;

-- 4. For views like equipment_status_summary, we need to secure the underlying tables
-- The view itself cannot have RLS, but the base tables should have proper RLS
-- Ensure company_equipment table has proper RLS (it should already have it)

-- 5. Create secure view functions for business data access
-- This replaces direct view access with function-based access that includes security

CREATE OR REPLACE FUNCTION public.get_equipment_status_summary_secure()
RETURNS TABLE (
  id uuid,
  company_id uuid,
  equipment_number text,
  equipment_type text,
  make text,
  model text,
  year integer,
  vin_number text,
  license_plate text,
  fuel_type text,
  status text,
  license_plate_expiry_date date,
  annual_inspection_expiry_date date,
  purchase_date date,
  purchase_price numeric,
  current_mileage integer,
  insurance_expiry_date date,
  registration_expiry_date date,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  geotab_vehicle_id uuid,
  notes text,
  has_title bigint,
  has_registration bigint,
  has_inspection bigint,
  has_form_2290 bigint,
  license_status text,
  registration_status text,
  inspection_status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ce.id,
    ce.company_id,
    ce.equipment_number,
    ce.equipment_type,
    ce.make,
    ce.model,
    ce.year,
    ce.vin_number,
    ce.license_plate,
    ce.fuel_type,
    ce.status,
    ce.license_plate_expiry_date,
    ce.annual_inspection_expiry_date,
    ce.purchase_date,
    ce.purchase_price,
    ce.current_mileage,
    ce.insurance_expiry_date,
    ce.registration_expiry_date,
    ce.created_by,
    ce.updated_by,
    ce.created_at,
    ce.updated_at,
    ce.geotab_vehicle_id,
    ce.notes,
    COALESCE((SELECT COUNT(*)::bigint FROM equipment_documents ed1 WHERE ed1.equipment_id = ce.id AND ed1.document_type = 'title' AND ed1.is_current = true), 0) as has_title,
    COALESCE((SELECT COUNT(*)::bigint FROM equipment_documents ed2 WHERE ed2.equipment_id = ce.id AND ed2.document_type = 'registration' AND ed2.is_current = true), 0) as has_registration,
    COALESCE((SELECT COUNT(*)::bigint FROM equipment_documents ed3 WHERE ed3.equipment_id = ce.id AND ed3.document_type = 'inspection' AND ed3.is_current = true), 0) as has_inspection,
    COALESCE((SELECT COUNT(*)::bigint FROM equipment_documents ed4 WHERE ed4.equipment_id = ce.id AND ed4.document_type = 'form_2290' AND ed4.is_current = true), 0) as has_form_2290,
    CASE
      WHEN ce.license_plate_expiry_date IS NULL THEN 'unknown'
      WHEN ce.license_plate_expiry_date < CURRENT_DATE THEN 'expired'
      WHEN ce.license_plate_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
      ELSE 'valid'
    END as license_status,
    CASE
      WHEN ce.registration_expiry_date IS NULL THEN 'unknown'
      WHEN ce.registration_expiry_date < CURRENT_DATE THEN 'expired'
      WHEN ce.registration_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
      ELSE 'valid'
    END as registration_status,
    CASE
      WHEN ce.annual_inspection_expiry_date IS NULL THEN 'unknown'
      WHEN ce.annual_inspection_expiry_date < CURRENT_DATE THEN 'expired'
      WHEN ce.annual_inspection_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
      ELSE 'valid'
    END as inspection_status
  FROM company_equipment ce
  WHERE ce.company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
  );
$$;