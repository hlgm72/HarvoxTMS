-- Fix the column reference in auto_recalculate_on_other_income function
-- The function is referencing oi.driver_user_id which doesn't exist, should be oi.user_id

-- First, let's create the other_income table if it doesn't exist (seems to be missing from schema)
CREATE TABLE IF NOT EXISTS other_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_period_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  income_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(payment_period_id, user_id, description, income_date)
);

-- Enable RLS on other_income table
ALTER TABLE other_income ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for other_income
CREATE POLICY "other_income_select" ON other_income
FOR SELECT USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  (
    user_id = auth.uid() OR
    payment_period_id IN (
      SELECT dpc.id 
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

CREATE POLICY "other_income_insert" ON other_income
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  payment_period_id IN (
    SELECT dpc.id 
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true AND NOT cpp.is_locked
  )
);

CREATE POLICY "other_income_update" ON other_income
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  payment_period_id IN (
    SELECT dpc.id 
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true AND NOT cpp.is_locked
  )
) WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  payment_period_id IN (
    SELECT dpc.id 
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true AND NOT cpp.is_locked
  )
);

-- Add trigger for other_income to auto-recalculate payment periods
CREATE OR REPLACE TRIGGER trigger_auto_recalculate_on_other_income
  AFTER INSERT OR UPDATE OR DELETE ON other_income
  FOR EACH ROW EXECUTE FUNCTION auto_recalculate_on_other_income();

-- Create updated_at trigger for other_income
CREATE OR REPLACE TRIGGER update_other_income_updated_at
  BEFORE UPDATE ON other_income
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;