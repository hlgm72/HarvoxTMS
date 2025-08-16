-- Enable RLS on equipment_status_summary view to prevent unauthorized access
-- This view contains sensitive equipment data including VIN numbers and financial information

-- Enable Row Level Security on the view
ALTER TABLE equipment_status_summary ENABLE ROW LEVEL SECURITY;

-- Create optimized RLS policy for company equipment summary view
-- Only allow access to users who are members of the equipment's company
CREATE POLICY "equipment_status_summary_company_access"
ON equipment_status_summary
FOR SELECT
TO authenticated
USING (
  -- Optimize auth function calls by wrapping in SELECT
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    -- User must be a member of the company that owns this equipment
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
    )
  )
);

-- Add comment documenting the security implementation
COMMENT ON TABLE equipment_status_summary IS 'Equipment status summary view with RLS protection. Access restricted to company members only for security of sensitive equipment and financial data.';

-- Log this security enhancement
INSERT INTO deployment_log (
  deployment_id,
  event_type,
  status,
  event_data
) VALUES (
  'security-fix-' || extract(epoch from now())::text,
  'security_policy_update',
  'completed',
  jsonb_build_object(
    'table', 'equipment_status_summary',
    'action', 'enable_rls_and_create_policy',
    'reason', 'fix_exposed_equipment_data',
    'timestamp', now()
  )
);