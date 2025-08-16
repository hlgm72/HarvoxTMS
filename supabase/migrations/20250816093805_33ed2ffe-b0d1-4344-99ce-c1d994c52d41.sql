-- Fix critical security vulnerability: Enable RLS on equipment_status_summary table

-- Enable Row Level Security on equipment_status_summary table
ALTER TABLE public.equipment_status_summary ENABLE ROW LEVEL SECURITY;

-- Create secure RLS policies for equipment_status_summary table
-- Only authenticated company users can view equipment data from their companies

CREATE POLICY "equipment_status_summary_secure_select" ON public.equipment_status_summary
FOR SELECT 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

-- No INSERT, UPDATE, or DELETE policies needed as this appears to be a summary/view table
-- that should be read-only for users