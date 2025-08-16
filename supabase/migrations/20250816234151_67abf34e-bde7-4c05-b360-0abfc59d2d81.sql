-- Temporarily create a more permissive policy for debugging
-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert load documents for their company loads" ON public.load_documents;

-- Create a temporary debugging policy that allows all authenticated users
CREATE POLICY "temp_debug_load_documents_insert"
ON public.load_documents
FOR INSERT
TO public
WITH CHECK (
  -- Just check if user is authenticated and load exists
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  load_id IN (SELECT id FROM loads)
);