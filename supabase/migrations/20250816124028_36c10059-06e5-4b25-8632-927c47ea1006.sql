-- Fix security definer view issue by removing SECURITY DEFINER function
-- and implementing proper SECURITY INVOKER approach

-- Drop the problematic security definer function and view
DROP VIEW IF EXISTS companies_financial_data;
DROP FUNCTION IF EXISTS get_company_financial_data(UUID);

-- Create a properly secured view that respects the querying user's permissions
-- This view will use SECURITY INVOKER (default) and rely on the underlying table's RLS
CREATE VIEW companies_financial_data 
WITH (security_invoker = true) AS
SELECT 
  c.id,
  c.name,
  c.street_address,
  c.state_id,
  c.zip_code,
  c.city,
  c.phone,
  c.email,
  c.logo_url,
  c.plan_type,
  c.status,
  c.created_at,
  c.updated_at,
  -- Conditional sensitive fields based on role-based access
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.ein 
    ELSE NULL 
  END as ein,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.mc_number 
    ELSE NULL 
  END as mc_number,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.dot_number 
    ELSE NULL 
  END as dot_number,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.owner_name 
    ELSE NULL 
  END as owner_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.owner_email 
    ELSE NULL 
  END as owner_email,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.owner_phone 
    ELSE NULL 
  END as owner_phone,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.owner_title 
    ELSE NULL 
  END as owner_title,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.max_vehicles 
    ELSE NULL 
  END as max_vehicles,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.max_users 
    ELSE NULL 
  END as max_users,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.contract_start_date 
    ELSE NULL 
  END as contract_start_date,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.default_payment_frequency 
    ELSE NULL 
  END as default_payment_frequency,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.payment_cycle_start_day 
    ELSE NULL 
  END as payment_cycle_start_day,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.payment_day 
    ELSE NULL 
  END as payment_day,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.default_factoring_percentage 
    ELSE NULL 
  END as default_factoring_percentage,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.default_dispatching_percentage 
    ELSE NULL 
  END as default_dispatching_percentage,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.default_leasing_percentage 
    ELSE NULL 
  END as default_leasing_percentage,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = c.id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.load_assignment_criteria 
    ELSE NULL 
  END as load_assignment_criteria
FROM companies c;