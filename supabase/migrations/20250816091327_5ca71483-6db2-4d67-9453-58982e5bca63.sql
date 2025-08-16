-- FIX SUPABASE SECURITY WARNINGS

-- ================================
-- 1. FIX FUNCTION SEARCH PATH MUTABLE
-- ================================

-- Fix calculate_payment_date function search path
CREATE OR REPLACE FUNCTION public.calculate_payment_date(
  company_id_param uuid,
  target_date date DEFAULT CURRENT_DATE
)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payment_day_val text;
  payment_frequency_val text;
  cycle_start_day_val integer;
  calculated_date date;
BEGIN
  -- Get company payment settings
  SELECT 
    COALESCE(payment_day, 'friday'),
    COALESCE(default_payment_frequency, 'weekly'),
    COALESCE(payment_cycle_start_day, 1)
  INTO 
    payment_day_val,
    payment_frequency_val,
    cycle_start_day_val
  FROM companies
  WHERE id = company_id_param;
  
  -- If company not found, return null
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Calculate based on frequency
  CASE payment_frequency_val
    WHEN 'weekly' THEN
      -- Find next occurrence of payment_day
      calculated_date := target_date + (
        CASE payment_day_val
          WHEN 'monday' THEN 1
          WHEN 'tuesday' THEN 2
          WHEN 'wednesday' THEN 3
          WHEN 'thursday' THEN 4
          WHEN 'friday' THEN 5
          WHEN 'saturday' THEN 6
          WHEN 'sunday' THEN 0
          ELSE 5 -- default to friday
        END - EXTRACT(DOW FROM target_date)::integer + 7
      ) % 7;
      
      -- If same day, move to next week
      IF calculated_date = target_date THEN
        calculated_date := calculated_date + 7;
      END IF;
    
    WHEN 'biweekly' THEN
      -- Similar logic but every 2 weeks
      calculated_date := target_date + 14;
    
    WHEN 'monthly' THEN
      -- Use cycle_start_day as the day of month
      calculated_date := date_trunc('month', target_date) + interval '1 month' + (cycle_start_day_val - 1);
    
    ELSE
      -- Default to weekly friday
      calculated_date := target_date + (5 - EXTRACT(DOW FROM target_date)::integer + 7) % 7;
  END CASE;
  
  RETURN calculated_date;
END;
$$;

-- ================================
-- 2. FIX ANONYMOUS ACCESS POLICIES
-- ================================

-- Fix expense_types policies
DROP POLICY IF EXISTS "expense_types_delete" ON expense_types;
DROP POLICY IF EXISTS "expense_types_update" ON expense_types;

CREATE POLICY "expense_types_delete_authenticated_only"
  ON expense_types FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
    )
  );

CREATE POLICY "expense_types_update_authenticated_only"
  ON expense_types FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
    )
  );

-- Fix profiles policies
DROP POLICY IF EXISTS "Company admins can view profiles of their company users" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

CREATE POLICY "profiles_authenticated_company_admins_view"
  ON profiles FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    (
      auth.uid() = user_id OR
      user_id IN (
        SELECT ucr1.user_id
        FROM user_company_roles ucr1
        WHERE ucr1.company_id IN (
          SELECT ucr2.company_id
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = auth.uid()
          AND ucr2.is_active = true
          AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
        )
        AND ucr1.is_active = true
      )
    )
  );

CREATE POLICY "profiles_authenticated_users_update_own"
  ON profiles FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    auth.uid() = user_id
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    auth.uid() = user_id
  );

CREATE POLICY "profiles_authenticated_users_view_own"
  ON profiles FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    auth.uid() = user_id
  );

-- Fix security_audit_log policy
DROP POLICY IF EXISTS "security_audit_log_superadmin_only" ON security_audit_log;

CREATE POLICY "security_audit_log_authenticated_superadmin_only"
  ON security_audit_log FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND role = 'superadmin'
      AND is_active = true
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND role = 'superadmin'
      AND is_active = true
    )
  );

-- Fix views.profiles policies (if the view exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'views' AND table_name = 'profiles') THEN
    DROP POLICY IF EXISTS "Company admins can view profiles of their company users" ON views.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON views.profiles;
    DROP POLICY IF EXISTS "Users can view their own profile" ON views.profiles;

    CREATE POLICY "views_profiles_authenticated_company_admins_view"
      ON views.profiles FOR SELECT
      USING (
        auth.role() = 'authenticated' AND
        auth.uid() IS NOT NULL AND
        COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
        (
          auth.uid() = user_id OR
          user_id IN (
            SELECT ucr1.user_id
            FROM user_company_roles ucr1
            WHERE ucr1.company_id IN (
              SELECT ucr2.company_id
              FROM user_company_roles ucr2
              WHERE ucr2.user_id = auth.uid()
              AND ucr2.is_active = true
              AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
            )
            AND ucr1.is_active = true
          )
        )
      );
  END IF;
END
$$;