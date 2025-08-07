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

-- Create RLS policies for loads
CREATE POLICY IF NOT EXISTS "loads_select" ON loads
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

CREATE POLICY IF NOT EXISTS "loads_insert" ON loads
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  created_by = auth.uid()
);

CREATE POLICY IF NOT EXISTS "loads_update" ON loads
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

-- Create load_stops table if it doesn't exist
CREATE TABLE IF NOT EXISTS load_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  load_id UUID NOT NULL,
  stop_number INTEGER NOT NULL,
  stop_type TEXT NOT NULL,
  company_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city UUID,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  reference_number TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  special_instructions TEXT,
  scheduled_date DATE,
  scheduled_time TEXT,
  actual_date DATE,
  actual_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on load_stops
ALTER TABLE load_stops ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for load_stops
CREATE POLICY IF NOT EXISTS "load_stops_access" ON load_stops
FOR ALL USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  load_id IN (
    SELECT l.id FROM loads l
    WHERE l.driver_user_id = auth.uid() OR 
          l.created_by = auth.uid() OR
          l.payment_period_id IN (
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

-- Create load_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS load_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  load_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on load_documents
ALTER TABLE load_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for load_documents
CREATE POLICY IF NOT EXISTS "load_documents_access" ON load_documents
FOR ALL USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  load_id IN (
    SELECT l.id FROM loads l
    WHERE l.driver_user_id = auth.uid() OR 
          l.created_by = auth.uid() OR
          l.payment_period_id IN (
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

-- Add updated_at triggers
CREATE OR REPLACE TRIGGER update_loads_updated_at
  BEFORE UPDATE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_load_stops_updated_at
  BEFORE UPDATE ON load_stops
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_load_documents_updated_at
  BEFORE UPDATE ON load_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();