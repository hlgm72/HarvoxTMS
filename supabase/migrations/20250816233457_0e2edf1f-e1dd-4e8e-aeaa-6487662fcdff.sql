-- Fix RLS policies for load_documents table to handle inserts properly

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert load documents for their company loads" ON public.load_documents;

-- Create improved INSERT policy that allows authenticated users to insert documents 
-- for loads they have access to, and automatically set uploaded_by
CREATE POLICY "Users can insert load documents for their company loads"
ON public.load_documents
FOR INSERT
TO public
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  load_id IN (
    SELECT l.id
    FROM loads l
    JOIN user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id OR
      ucr.user_id = (SELECT auth.uid())
    )
    WHERE ucr.company_id IN (
      SELECT company_id
      FROM user_company_roles
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    ) AND ucr.is_active = true
  )
);

-- Also update the uploaded_by column to be NOT NULL with a default
ALTER TABLE public.load_documents 
ALTER COLUMN uploaded_by SET NOT NULL;

ALTER TABLE public.load_documents 
ALTER COLUMN uploaded_by SET DEFAULT auth.uid();