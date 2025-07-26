-- Security Fix 1: Add comprehensive RLS policies for payment_reports table
-- This table currently has RLS enabled but no policies, blocking all access

-- Allow users to view payment reports for their company's periods
CREATE POLICY "Users can view payment reports for their company periods"
ON public.payment_reports
FOR SELECT
USING (
  payment_period_id IN (
    SELECT dpc.id 
    FROM public.driver_period_calculations dpc
    JOIN public.company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  )
);

-- Allow company owners and operations managers to create payment reports
CREATE POLICY "Company managers can create payment reports"
ON public.payment_reports
FOR INSERT
WITH CHECK (
  payment_period_id IN (
    SELECT dpc.id 
    FROM public.driver_period_calculations dpc
    JOIN public.company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role IN ('company_owner', 'operations_manager')
    AND ucr.is_active = true
  )
);

-- Allow company owners to update payment reports
CREATE POLICY "Company owners can update payment reports"
ON public.payment_reports
FOR UPDATE
USING (
  payment_period_id IN (
    SELECT dpc.id 
    FROM public.driver_period_calculations dpc
    JOIN public.company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- Allow company owners to delete payment reports (restricted access)
CREATE POLICY "Company owners can delete payment reports"
ON public.payment_reports
FOR DELETE
USING (
  payment_period_id IN (
    SELECT dpc.id 
    FROM public.driver_period_calculations dpc
    JOIN public.company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- Security Fix 2: Strengthen role management security
-- Add constraint to prevent self-privilege escalation to superadmin
CREATE OR REPLACE FUNCTION public.prevent_self_superadmin_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent users from assigning themselves superadmin role unless they are already superadmin
  IF NEW.role = 'superadmin' AND NEW.user_id = auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_company_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin' 
      AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Cannot assign superadmin role to yourself without existing superadmin privileges';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce the constraint
DROP TRIGGER IF EXISTS prevent_self_superadmin_trigger ON public.user_company_roles;
CREATE TRIGGER prevent_self_superadmin_trigger
  BEFORE INSERT OR UPDATE ON public.user_company_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_superadmin_assignment();

-- Security Fix 3: Add enhanced validation for role assignments
-- Update existing RLS policy for user_company_roles to be more restrictive
DROP POLICY IF EXISTS "Users can manage company roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Company owners can manage roles" ON public.user_company_roles;

-- More restrictive policy for role management
CREATE POLICY "Restricted role management policy"
ON public.user_company_roles
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role' 
  OR 
  -- Superadmins have full access
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role = 'superadmin' 
    AND ucr.is_active = true
  )
  OR
  -- Company owners can manage roles within their companies (but not superadmin)
  (
    company_id IN (
      SELECT ucr.company_id FROM public.user_company_roles ucr 
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role = 'company_owner' 
      AND ucr.is_active = true
    )
    AND role != 'superadmin'
  )
  OR
  -- Users can view their own roles
  user_id = auth.uid()
)
WITH CHECK (
  -- Service role can insert/update anything
  auth.role() = 'service_role'
  OR
  -- Superadmins can insert/update anything
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role = 'superadmin' 
    AND ucr.is_active = true
  )
  OR
  -- Company owners can manage non-superadmin roles in their companies
  (
    company_id IN (
      SELECT ucr.company_id FROM public.user_company_roles ucr 
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role = 'company_owner' 
      AND ucr.is_active = true
    )
    AND role != 'superadmin'
  )
);

-- Security Fix 4: Add audit logging for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only superadmins can view audit logs
CREATE POLICY "Superadmins can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role = 'superadmin' 
    AND ucr.is_active = true
  )
);

-- Create function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.security_audit_log (
      user_id, action_type, table_name, record_id, new_values
    ) VALUES (
      auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, 
      jsonb_build_object(
        'user_id', NEW.user_id,
        'company_id', NEW.company_id,
        'role', NEW.role,
        'is_active', NEW.is_active
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.security_audit_log (
      user_id, action_type, table_name, record_id, old_values, new_values
    ) VALUES (
      auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id,
      jsonb_build_object(
        'user_id', OLD.user_id,
        'company_id', OLD.company_id,
        'role', OLD.role,
        'is_active', OLD.is_active
      ),
      jsonb_build_object(
        'user_id', NEW.user_id,
        'company_id', NEW.company_id,
        'role', NEW.role,
        'is_active', NEW.is_active
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.security_audit_log (
      user_id, action_type, table_name, record_id, old_values
    ) VALUES (
      auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id,
      jsonb_build_object(
        'user_id', OLD.user_id,
        'company_id', OLD.company_id,
        'role', OLD.role,
        'is_active', OLD.is_active
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role change logging
DROP TRIGGER IF EXISTS log_role_changes_trigger ON public.user_company_roles;
CREATE TRIGGER log_role_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_company_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_changes();