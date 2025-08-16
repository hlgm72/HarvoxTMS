-- Fix security issue: Add RLS policies to companies_basic_info view
-- Since views inherit RLS from their base tables, we need to ensure proper RLS on the view

-- First check if companies_basic_info is a view or table
-- If it's a view, we'll need to recreate it with proper base table access
-- If it's a table, we'll add RLS policies directly

-- Enable RLS on companies_basic_info if it's a table
DO $$
BEGIN
  -- Check if it exists as a table
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'companies_basic_info'
  ) THEN
    -- It's a table, enable RLS
    ALTER TABLE public.companies_basic_info ENABLE ROW LEVEL SECURITY;
    
    -- Add RLS policies for secure access
    CREATE POLICY "companies_basic_info_authenticated_users_only"
    ON public.companies_basic_info
    FOR ALL
    TO authenticated
    USING (
      -- Only allow access if user is authenticated and belongs to this company
      auth.uid() IS NOT NULL 
      AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
      AND (
        -- User belongs to this company
        id IN (
          SELECT ucr.company_id
          FROM user_company_roles ucr
          WHERE ucr.user_id = auth.uid()
          AND ucr.is_active = true
        )
        OR
        -- User is superadmin
        EXISTS (
          SELECT 1 FROM user_company_roles
          WHERE user_id = auth.uid()
          AND role = 'superadmin'
          AND is_active = true
        )
      )
    )
    WITH CHECK (
      -- Same check for inserts/updates
      auth.uid() IS NOT NULL 
      AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
      AND (
        id IN (
          SELECT ucr.company_id
          FROM user_company_roles ucr
          WHERE ucr.user_id = auth.uid()
          AND ucr.is_active = true
        )
        OR
        EXISTS (
          SELECT 1 FROM user_company_roles
          WHERE user_id = auth.uid()
          AND role = 'superadmin'
          AND is_active = true
        )
      )
    );
    
    RAISE NOTICE 'Added RLS policies to companies_basic_info table';
    
  ELSE
    -- It's a view, so RLS should be inherited from base tables
    -- Let's verify the companies table has proper RLS
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'companies'
    ) THEN
      RAISE EXCEPTION 'Base companies table is missing RLS policies - this should not happen';
    END IF;
    
    RAISE NOTICE 'companies_basic_info is a view - RLS inherited from base companies table';
  END IF;
END $$;

-- Verify RLS is working correctly
SELECT 
  schemaname,
  COALESCE(tablename, viewname) as object_name,
  CASE 
    WHEN tablename IS NOT NULL THEN 'table'
    ELSE 'view'
  END as object_type,
  rowsecurity
FROM (
  SELECT schemaname, tablename, NULL as viewname, rowsecurity
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'companies_basic_info'
  
  UNION ALL
  
  SELECT schemaname, NULL as tablename, viewname, NULL as rowsecurity
  FROM pg_views 
  WHERE schemaname = 'public' 
  AND viewname = 'companies_basic_info'
) combined;