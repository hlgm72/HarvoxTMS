-- Update the load_documents table policies to use the same can_access_load logic
-- Drop existing policies and recreate with proper access control

DROP POLICY IF EXISTS "Users can view load documents from their company loads" ON public.load_documents;
DROP POLICY IF EXISTS "Users can insert load documents for their company loads" ON public.load_documents;
DROP POLICY IF EXISTS "Users can update load documents from their company loads" ON public.load_documents;
DROP POLICY IF EXISTS "Users can delete load documents from their company loads" ON public.load_documents;

-- Create new policies using can_access_load function
CREATE POLICY "Load documents - company access - SELECT"
ON public.load_documents
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_load(load_id)
);

CREATE POLICY "Load documents - company access - INSERT"
ON public.load_documents
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_load(load_id)
);

CREATE POLICY "Load documents - company access - UPDATE"
ON public.load_documents
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_load(load_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_load(load_id)
);

CREATE POLICY "Load documents - company access - DELETE"
ON public.load_documents
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_load(load_id)
);