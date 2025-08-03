-- CRITICAL SECURITY FIXES - Part 1
-- Fix 1: Enable RLS on loads_archive table and create proper policies
ALTER TABLE public.loads_archive ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for loads_archive (identical to loads table policies)
CREATE POLICY "Users can view loads_archive for their company" 
ON public.loads_archive 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  ((auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND 
  (
    driver_user_id = auth.uid() OR
    created_by = auth.uid() OR
    driver_user_id IN (
      SELECT ucr.user_id 
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id 
        FROM user_company_roles ucr2 
        WHERE ucr2.user_id = auth.uid() 
        AND ucr2.is_active = true
      ) 
      AND ucr.is_active = true
    )
  )
);

CREATE POLICY "Company admins can manage loads_archive" 
ON public.loads_archive 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  ((auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND 
  driver_user_id IN (
    SELECT ucr.user_id 
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id 
      FROM user_company_roles ucr2 
      WHERE ucr2.user_id = auth.uid() 
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr2.is_active = true
    ) 
    AND ucr.is_active = true
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  ((auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND 
  driver_user_id IN (
    SELECT ucr.user_id 
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id 
      FROM user_company_roles ucr2 
      WHERE ucr2.user_id = auth.uid() 
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr2.is_active = true
    ) 
    AND ucr.is_active = true
  )
);