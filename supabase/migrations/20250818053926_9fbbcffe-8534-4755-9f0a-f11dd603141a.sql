-- Add new datetime fields to load_stops table
ALTER TABLE public.load_stops 
ADD COLUMN eta_date DATE,
ADD COLUMN eta_time TIME,
ADD COLUMN actual_arrival_datetime TIMESTAMP WITH TIME ZONE,
ADD COLUMN completion_datetime TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_status_update TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create load_status_history table for tracking all status changes
CREATE TABLE public.load_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  load_id UUID NOT NULL,
  stop_id UUID NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  eta_provided TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on load_status_history
ALTER TABLE public.load_status_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for load_status_history (users can see history for loads in their company)
CREATE POLICY "load_status_history_company_access" 
ON public.load_status_history 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    -- User is the driver of the load
    load_id IN (
      SELECT l.id 
      FROM loads l
      WHERE l.driver_user_id = auth.uid()
    )
    OR
    -- User has access through company (driver or client company)
    load_id IN (
      SELECT l.id 
      FROM loads l
      LEFT JOIN user_company_roles ucr_driver ON l.driver_user_id = ucr_driver.user_id AND ucr_driver.is_active = true
      LEFT JOIN company_clients cc ON l.client_id = cc.id
      WHERE 
        ucr_driver.company_id IN (
          SELECT ucr.company_id 
          FROM user_company_roles ucr 
          WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
        )
        OR 
        cc.company_id IN (
          SELECT ucr.company_id 
          FROM user_company_roles ucr 
          WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
        )
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

-- Create function to log load status changes
CREATE OR REPLACE FUNCTION public.log_load_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.load_status_history (
      load_id,
      previous_status,
      new_status,
      changed_by,
      changed_at,
      notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      now(),
      'Status changed automatically'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on loads table to automatically log status changes
CREATE TRIGGER loads_status_change_trigger
  AFTER UPDATE ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_load_status_change();