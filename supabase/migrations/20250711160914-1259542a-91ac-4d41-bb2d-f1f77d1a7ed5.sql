-- Fix Security Issues: Set search_path for all functions
-- This prevents schema injection attacks by setting a fixed search_path

-- 1. Fix all functions with mutable search_path
CREATE OR REPLACE FUNCTION public.validate_reset_token(token_param text)
RETURNS TABLE(id uuid, user_email text, is_valid boolean, expires_at timestamp with time zone)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    prt.id,
    prt.user_email,
    (prt.expires_at > now() AND prt.is_used = false) as is_valid,
    prt.expires_at
  FROM public.password_reset_tokens prt
  WHERE prt.token = token_param;
$$;

CREATE OR REPLACE FUNCTION public.use_reset_token(token_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  token_record RECORD;
BEGIN
  SELECT * INTO token_record 
  FROM public.password_reset_tokens 
  WHERE token = token_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Token not found');
  END IF;
  
  IF token_record.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Token expired');
  END IF;
  
  IF token_record.is_used THEN
    RETURN jsonb_build_object('success', false, 'message', 'Token already used');
  END IF;
  
  UPDATE public.password_reset_tokens 
  SET is_used = true, used_at = now()
  WHERE token = token_param;
  
  RETURN jsonb_build_object(
    'success', true, 
    'user_email', token_record.user_email,
    'message', 'Token validated successfully'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  DELETE FROM public.password_reset_tokens 
  WHERE expires_at <= now() - interval '24 hours'
  RETURNING 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.maintenance_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM public.cleanup_expired_reset_tokens();
  
  ANALYZE public.user_company_roles;
  ANALYZE public.payment_periods;
  ANALYZE public.fuel_expenses;
  ANALYZE public.loads;
  
  INSERT INTO public.system_stats (stat_type, stat_value)
  VALUES ('maintenance_run', jsonb_build_object(
    'timestamp', now(),
    'performed_by', 'system'
  ));
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_fuel_summary_for_period(period_id uuid)
RETURNS TABLE(total_gallons numeric, total_amount numeric, average_price_per_gallon numeric, transaction_count integer, pending_amount numeric, approved_amount numeric)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(fe.gallons_purchased), 0)::DECIMAL(10,3) as total_gallons,
    COALESCE(SUM(fe.total_amount), 0)::DECIMAL(12,2) as total_amount,
    CASE 
      WHEN SUM(fe.gallons_purchased) > 0 
      THEN (SUM(fe.total_amount) / SUM(fe.gallons_purchased))::DECIMAL(8,3)
      ELSE 0::DECIMAL(8,3)
    END as average_price_per_gallon,
    COUNT(*)::INTEGER as transaction_count,
    COALESCE(SUM(CASE WHEN fe.status = 'pending' THEN fe.total_amount ELSE 0 END), 0)::DECIMAL(12,2) as pending_amount,
    COALESCE(SUM(CASE WHEN fe.status = 'approved' THEN fe.total_amount ELSE 0 END), 0)::DECIMAL(12,2) as approved_amount
  FROM public.fuel_expenses fe
  WHERE fe.payment_period_id = period_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.lock_payment_period(period_id uuid, payment_method_used text DEFAULT NULL::text, payment_ref text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  period_record RECORD;
  related_count INTEGER;
BEGIN
  SELECT * INTO period_record 
  FROM public.payment_periods 
  WHERE id = period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
  END IF;
  
  IF period_record.is_locked THEN
    RETURN jsonb_build_object('success', false, 'message', 'El período ya está bloqueado');
  END IF;
  
  IF period_record.status NOT IN ('approved', 'paid') THEN
    RETURN jsonb_build_object('success', false, 'message', 'El período debe estar aprobado o pagado para bloquear');
  END IF;
  
  SELECT 
    (SELECT COUNT(*) FROM public.fuel_expenses WHERE payment_period_id = period_id) +
    (SELECT COUNT(*) FROM public.expense_instances WHERE payment_period_id = period_id) +
    (SELECT COUNT(*) FROM public.other_income WHERE payment_period_id = period_id)
  INTO related_count;
  
  UPDATE public.payment_periods 
  SET 
    is_locked = true,
    locked_at = now(),
    locked_by = auth.uid(),
    status = 'locked',
    payment_method = payment_method_used,
    payment_reference = payment_ref
  WHERE id = period_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Período bloqueado exitosamente',
    'period_id', period_id,
    'locked_records', related_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_period_locked(period_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(is_locked, false) 
  FROM public.payment_periods 
  WHERE id = period_id;
$$;

CREATE OR REPLACE FUNCTION public.report_payment_and_lock(period_id uuid, method_id uuid, amount_paid numeric, reference_num text DEFAULT NULL::text, payment_notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  period_record RECORD;
  method_record RECORD;
  report_id UUID;
BEGIN
  SELECT * INTO period_record FROM public.payment_periods WHERE id = period_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
  END IF;
  
  IF period_record.is_locked THEN
    RETURN jsonb_build_object('success', false, 'message', 'El período ya está bloqueado');
  END IF;
  
  SELECT * INTO method_record FROM public.payment_methods WHERE id = method_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Método de pago no válido');
  END IF;
  
  IF method_record.requires_reference AND (reference_num IS NULL OR reference_num = '') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Este método de pago requiere número de referencia');
  END IF;
  
  INSERT INTO public.payment_reports (
    payment_period_id, payment_method_id, amount, reference_number, 
    notes, reported_by, status
  ) VALUES (
    period_id, method_id, amount_paid, reference_num, 
    payment_notes, auth.uid(), 'verified'
  ) RETURNING id INTO report_id;
  
  UPDATE public.payment_periods 
  SET 
    is_locked = true,
    locked_at = now(),
    locked_by = auth.uid(),
    status = 'paid',
    payment_method = method_record.name,
    payment_reference = reference_num
  WHERE id = period_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Pago reportado y período bloqueado exitosamente',
    'report_id', report_id,
    'period_id', period_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.inherit_owner_operator_percentages()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.owner_operators 
    WHERE user_id = NEW.driver_user_id AND is_active = true
  ) THEN
    IF NEW.factoring_percentage IS NULL OR NEW.dispatching_percentage IS NULL OR NEW.leasing_percentage IS NULL THEN
      SELECT 
        COALESCE(NEW.factoring_percentage, oo.factoring_percentage),
        COALESCE(NEW.dispatching_percentage, oo.dispatching_percentage),
        COALESCE(NEW.leasing_percentage, oo.leasing_percentage)
      INTO 
        NEW.factoring_percentage,
        NEW.dispatching_percentage,
        NEW.leasing_percentage
      FROM public.owner_operators oo
      WHERE oo.user_id = NEW.driver_user_id AND oo.is_active = true;
    END IF;
  ELSE
    NEW.factoring_percentage := NULL;
    NEW.dispatching_percentage := NULL;
    NEW.leasing_percentage := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles 
    WHERE user_id = user_id_param 
    AND role = 'superadmin' 
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_real_companies()
RETURNS TABLE(id uuid)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT companies.id FROM public.companies 
  WHERE companies.name != 'SYSTEM_SUPERADMIN';
$$;

CREATE OR REPLACE FUNCTION public.company_has_owner(company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles 
    WHERE company_id = company_id_param 
    AND role = 'company_owner' 
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.validate_invitation_token(token_param text)
RETURNS TABLE(invitation_id uuid, company_id uuid, email text, role user_role, is_valid boolean)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    ui.id,
    ui.company_id,
    ui.email,
    ui.role,
    (ui.expires_at > now() AND ui.accepted_at IS NULL) as is_valid
  FROM public.user_invitations ui
  WHERE ui.invitation_token = token_param;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.user_company_roles 
  WHERE user_id = auth.uid() AND is_active = true 
  LIMIT 1;
$$;

-- Move pg_net extension from public to extensions schema
-- Note: This may require manual intervention in some cases
CREATE SCHEMA IF NOT EXISTS extensions;
-- We can't directly move the extension, but we can note it for manual fix

-- Log the security fixes
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('security_fixes', jsonb_build_object(
  'timestamp', now(),
  'fixes_applied', jsonb_build_array(
    'function_search_path_fixed',
    'all_security_definer_functions_secured'
  ),
  'remaining_manual_fixes', jsonb_build_array(
    'move_pg_net_extension',
    'configure_auth_settings'
  )
));