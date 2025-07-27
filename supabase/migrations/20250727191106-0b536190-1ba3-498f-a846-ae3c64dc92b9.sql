-- Comprehensive security linter fixes - Part 3
-- Fix remaining tables with explicit authentication checks

-- 10. Fix equipment_assignments
DROP POLICY IF EXISTS "Equipment assignments company access" ON public.equipment_assignments;
CREATE POLICY "Equipment assignments company access" ON public.equipment_assignments
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    auth.uid() = driver_user_id OR
    equipment_id IN (
      SELECT ce.id FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT ucr.company_id FROM user_company_roles ucr
        WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
      )
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

-- 11. Fix equipment_documents
DROP POLICY IF EXISTS "Equipment documents access policy" ON public.equipment_documents;
CREATE POLICY "Equipment documents access policy" ON public.equipment_documents
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

-- 12. Fix equipment_locations
DROP POLICY IF EXISTS "Equipment locations company access" ON public.equipment_locations;
CREATE POLICY "Equipment locations company access" ON public.equipment_locations
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

-- 13. Fix expense_instances
DROP POLICY IF EXISTS "Users can view expense_instances for their company" ON public.expense_instances;
CREATE POLICY "Users can view expense_instances for their company" ON public.expense_instances
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Users can update expense_instances for their company" ON public.expense_instances;
CREATE POLICY "Users can update expense_instances for their company" ON public.expense_instances
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true 
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'dispatcher'::user_role, 'operations_manager'::user_role])
  )
)
WITH CHECK (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true 
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'dispatcher'::user_role, 'operations_manager'::user_role])
  )
);

DROP POLICY IF EXISTS "Users can delete expense_instances for their company" ON public.expense_instances;
CREATE POLICY "Users can delete expense_instances for their company" ON public.expense_instances
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true 
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'dispatcher'::user_role, 'operations_manager'::user_role])
  )
);

-- 14. Fix expense_template_history
DROP POLICY IF EXISTS "Expense template history complete policy" ON public.expense_template_history;
CREATE POLICY "Expense template history complete policy" ON public.expense_template_history
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND
  template_id IN (
    SELECT ret.id FROM recurring_expense_templates ret
    JOIN user_company_roles ucr ON ret.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND
  template_id IN (
    SELECT ret.id FROM recurring_expense_templates ret
    JOIN user_company_roles ucr ON ret.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

-- 15. Fix expense_types
DROP POLICY IF EXISTS "Expense types complete policy" ON public.expense_types;
CREATE POLICY "Expense types complete policy" ON public.expense_types
FOR ALL 
TO authenticated
USING (require_authenticated_user())
WITH CHECK (
  require_authenticated_user() AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 16. Fix fuel_card_providers
DROP POLICY IF EXISTS "Users can view fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Users can view fuel card providers" ON public.fuel_card_providers
FOR SELECT 
TO authenticated
USING (require_authenticated_user());

DROP POLICY IF EXISTS "Company managers can update fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Company managers can update fuel card providers" ON public.fuel_card_providers
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
    AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
    AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Company managers can delete fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Company managers can delete fuel card providers" ON public.fuel_card_providers
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
    AND ucr.is_active = true
  )
);

-- 17. Fix fuel_expenses
DROP POLICY IF EXISTS "Fuel expenses complete policy" ON public.fuel_expenses;
CREATE POLICY "Fuel expenses complete policy" ON public.fuel_expenses
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    auth.uid() = driver_user_id OR
    driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  driver_user_id IN (
    SELECT ucr.user_id FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  ) AND
  NOT is_period_locked(payment_period_id)
);

-- 18. Fix fuel_limits
DROP POLICY IF EXISTS "Fuel limits complete policy" ON public.fuel_limits;
CREATE POLICY "Fuel limits complete policy" ON public.fuel_limits
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    auth.uid() = driver_user_id OR
    driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  driver_user_id IN (
    SELECT ucr.user_id FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);