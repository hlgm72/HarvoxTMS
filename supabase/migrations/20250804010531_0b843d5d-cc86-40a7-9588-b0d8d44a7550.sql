-- Recreate other_income table with logical organization
-- Second section: User and company relationships

-- Step 1: Create temporary table with organized structure
CREATE TABLE public.other_income_temp (
  -- Primary identification
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- User and company relationships
  user_id uuid NOT NULL,
  payment_period_id uuid NOT NULL,
  applied_to_role user_role NOT NULL,
  
  -- Income details
  income_type text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  income_date date NOT NULL,
  
  -- Administrative fields
  status text NOT NULL DEFAULT 'pending',
  reference_number text,
  receipt_url text,
  notes text,
  
  -- Approval tracking
  approved_by uuid,
  approved_at timestamp with time zone,
  created_by uuid,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Step 2: Copy data from existing table
INSERT INTO public.other_income_temp (
  id, user_id, payment_period_id, applied_to_role, income_type, description, amount, income_date,
  status, reference_number, receipt_url, notes, approved_by, approved_at, created_by, created_at, updated_at
)
SELECT 
  id, user_id, payment_period_id, applied_to_role, income_type, description, amount, income_date,
  status, reference_number, receipt_url, notes, approved_by, approved_at, created_by, created_at, updated_at
FROM public.other_income;

-- Step 3: Drop old table and rename new one
DROP TABLE public.other_income CASCADE;
ALTER TABLE public.other_income_temp RENAME TO other_income;

-- Step 4: Add constraints and indexes
CREATE INDEX idx_other_income_user_id ON public.other_income(user_id);
CREATE INDEX idx_other_income_payment_period_id ON public.other_income(payment_period_id);
CREATE INDEX idx_other_income_income_date ON public.other_income(income_date);
CREATE INDEX idx_other_income_status ON public.other_income(status);

-- Step 5: Enable Row Level Security
ALTER TABLE public.other_income ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
CREATE POLICY "other_income_select" ON public.other_income
FOR SELECT USING (
  is_authenticated_non_anon() AND (
    user_id = get_current_user_id_optimized() 
    OR payment_period_id IN (
      SELECT dpc.id
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = get_current_user_id_optimized() AND ucr.is_active = true
    )
  )
);

CREATE POLICY "other_income_insert" ON public.other_income
FOR INSERT WITH CHECK (
  is_authenticated_non_anon() AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = get_current_user_id_optimized() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "other_income_update" ON public.other_income
FOR UPDATE USING (
  is_authenticated_non_anon() AND (
    payment_period_id IN (
      SELECT dpc.id
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = get_current_user_id_optimized() 
      AND ucr.is_active = true 
      AND NOT cpp.is_locked
    )
  )
) WITH CHECK (
  is_authenticated_non_anon() AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = get_current_user_id_optimized() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "other_income_delete" ON public.other_income
FOR DELETE USING (
  is_authenticated_non_anon() AND (
    payment_period_id IN (
      SELECT dpc.id
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = get_current_user_id_optimized() 
      AND ucr.is_active = true 
      AND NOT cpp.is_locked
    )
  )
);

-- Step 7: Add updated_at trigger
CREATE TRIGGER update_other_income_updated_at
  BEFORE UPDATE ON public.other_income
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();