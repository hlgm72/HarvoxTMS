-- Fix RLS policies for load_stops table
-- First enable RLS if not already enabled
ALTER TABLE public.load_stops ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "load_stops_select_policy" ON public.load_stops;
DROP POLICY IF EXISTS "load_stops_insert_policy" ON public.load_stops;
DROP POLICY IF EXISTS "load_stops_update_policy" ON public.load_stops;
DROP POLICY IF EXISTS "load_stops_delete_policy" ON public.load_stops;

-- SELECT policy: Users can view load stops for loads they have access to
CREATE POLICY "load_stops_select_policy" ON public.load_stops
FOR SELECT USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  load_id IN (
    SELECT l.id FROM public.loads l
    JOIN public.user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id
    )
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  )
);

-- INSERT policy: Users can create load stops for loads they have access to
CREATE POLICY "load_stops_insert_policy" ON public.load_stops
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  load_id IN (
    SELECT l.id FROM public.loads l
    JOIN public.user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id
    )
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  )
);

-- UPDATE policy: Users can update load stops for loads they have access to
CREATE POLICY "load_stops_update_policy" ON public.load_stops
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  load_id IN (
    SELECT l.id FROM public.loads l
    JOIN public.user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id
    )
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  )
) WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  load_id IN (
    SELECT l.id FROM public.loads l
    JOIN public.user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id
    )
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  )
);

-- DELETE policy: Users can delete load stops for loads they have access to
CREATE POLICY "load_stops_delete_policy" ON public.load_stops
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  load_id IN (
    SELECT l.id FROM public.loads l
    JOIN public.user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id
    )
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  )
);