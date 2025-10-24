-- 🔒 CORREGIR SEARCH_PATH EN FUNCIÓN DE MAPEO

CREATE OR REPLACE FUNCTION map_user_role_to_payroll_role(p_user_role text)
RETURNS payroll_role_type
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN CASE p_user_role
    WHEN 'company_owner' THEN 'owner_operator'::payroll_role_type
    WHEN 'driver' THEN 'owner_operator'::payroll_role_type
    WHEN 'operations_manager' THEN 'dispatcher'::payroll_role_type
    WHEN 'senior_dispatcher' THEN 'dispatcher'::payroll_role_type
    WHEN 'dispatcher' THEN 'dispatcher'::payroll_role_type
    WHEN 'superadmin' THEN 'dispatcher'::payroll_role_type
    ELSE 'owner_operator'::payroll_role_type
  END;
END;
$$;