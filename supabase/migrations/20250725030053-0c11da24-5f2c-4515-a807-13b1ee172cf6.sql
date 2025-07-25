-- Optimize RLS policies for expense_instances table to fix performance warnings

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view expense_instances for their company" ON public.expense_instances;
DROP POLICY IF EXISTS "Users can insert expense_instances for their company" ON public.expense_instances;
DROP POLICY IF EXISTS "Users can update expense_instances for their company" ON public.expense_instances;
DROP POLICY IF EXISTS "Users can delete expense_instances for their company" ON public.expense_instances;

-- Create optimized policies with (SELECT auth.uid()) to avoid re-evaluation per row

-- Policy to allow users to view expense instances for their company payment periods
CREATE POLICY "Users can view expense_instances for their company" 
ON public.expense_instances FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.driver_period_calculations dpc
    JOIN public.company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE dpc.id = expense_instances.payment_period_id
      AND ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
  )
);

-- Policy to allow users to insert expense instances for their company payment periods
CREATE POLICY "Users can insert expense_instances for their company" 
ON public.expense_instances FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.driver_period_calculations dpc
    JOIN public.company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE dpc.id = expense_instances.payment_period_id
      AND ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'dispatcher', 'operations_manager')
  )
);

-- Policy to allow users to update expense instances for their company payment periods
CREATE POLICY "Users can update expense_instances for their company" 
ON public.expense_instances FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.driver_period_calculations dpc
    JOIN public.company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE dpc.id = expense_instances.payment_period_id
      AND ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'dispatcher', 'operations_manager')
  )
);

-- Policy to allow users to delete expense instances for their company payment periods
CREATE POLICY "Users can delete expense_instances for their company" 
ON public.expense_instances FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.driver_period_calculations dpc
    JOIN public.company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE dpc.id = expense_instances.payment_period_id
      AND ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'dispatcher', 'operations_manager')
  )
);