-- Ensure loads table exists with proper structure
CREATE TABLE IF NOT EXISTS loads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  load_number TEXT NOT NULL UNIQUE,
  po_number TEXT,
  driver_user_id UUID,
  internal_dispatcher_id UUID,
  client_id UUID,
  client_contact_id UUID,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  commodity TEXT,
  weight_lbs INTEGER,
  notes TEXT,
  customer_name TEXT,
  factoring_percentage NUMERIC,
  dispatching_percentage NUMERIC,
  leasing_percentage NUMERIC,
  status TEXT NOT NULL DEFAULT 'created',
  created_by UUID,
  payment_period_id UUID,
  pickup_date DATE,
  delivery_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on loads table
ALTER TABLE loads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "loads_select" ON loads;
DROP POLICY IF EXISTS "loads_insert" ON loads;
DROP POLICY IF EXISTS "loads_update" ON loads;

-- Create RLS policies for loads
CREATE POLICY "loads_select" ON loads
FOR SELECT USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  (
    driver_user_id = auth.uid() OR
    created_by = auth.uid() OR
    payment_period_id IN (
      SELECT cpp.id 
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

CREATE POLICY "loads_insert" ON loads
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  created_by = auth.uid()
);

CREATE POLICY "loads_update" ON loads
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  (
    driver_user_id = auth.uid() OR
    created_by = auth.uid() OR
    payment_period_id IN (
      SELECT cpp.id 
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
) WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE
);