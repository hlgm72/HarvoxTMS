-- Reemplazar la política temporal con una que use las funciones auxiliares existentes
-- que están diseñadas específicamente para RLS

-- Drop existing policy
DROP POLICY IF EXISTS "temp_debug_load_documents_insert" ON public.load_documents;

-- Create policy using the existing RLS helper functions
CREATE POLICY "Users can insert load documents for their company loads"
ON public.load_documents
FOR INSERT
TO public
WITH CHECK (
  -- Use the existing helper function for authentication
  is_authenticated_non_anon() AND
  -- Check if user has access to the load through company roles
  load_id IN (
    SELECT l.id
    FROM loads l
    WHERE EXISTS (
      SELECT 1
      FROM user_company_roles ucr1
      WHERE ucr1.user_id = get_current_user_for_rls()
      AND ucr1.is_active = true
      AND ucr1.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE (
          l.driver_user_id = ucr2.user_id OR 
          l.created_by = ucr2.user_id OR
          ucr2.user_id = get_current_user_for_rls()
        )
        AND ucr2.is_active = true
      )
    )
  )
);