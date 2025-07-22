-- Drop existing policies for load_documents
DROP POLICY IF EXISTS "Load documents comprehensive policy" ON public.load_documents;

-- Create simpler and more robust RLS policies for load_documents
CREATE POLICY "Users can view load documents from their company loads" 
ON public.load_documents 
FOR SELECT 
USING (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    load_id IN (
      SELECT l.id
      FROM public.loads l
      JOIN public.user_company_roles ucr ON (
        l.driver_user_id = ucr.user_id OR 
        l.created_by = ucr.user_id
      )
      WHERE ucr.company_id IN (
        SELECT company_id 
        FROM public.user_company_roles 
        WHERE user_id = auth.uid() AND is_active = true
      )
      AND ucr.is_active = true
    )
  )
);

CREATE POLICY "Users can insert load documents for their company loads" 
ON public.load_documents 
FOR INSERT 
WITH CHECK (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    load_id IN (
      SELECT l.id
      FROM public.loads l
      JOIN public.user_company_roles ucr ON (
        l.driver_user_id = ucr.user_id OR 
        l.created_by = ucr.user_id
      )
      WHERE ucr.company_id IN (
        SELECT company_id 
        FROM public.user_company_roles 
        WHERE user_id = auth.uid() AND is_active = true
      )
      AND ucr.is_active = true
    )
  )
);

CREATE POLICY "Users can update load documents from their company loads" 
ON public.load_documents 
FOR UPDATE 
USING (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    load_id IN (
      SELECT l.id
      FROM public.loads l
      JOIN public.user_company_roles ucr ON (
        l.driver_user_id = ucr.user_id OR 
        l.created_by = ucr.user_id
      )
      WHERE ucr.company_id IN (
        SELECT company_id 
        FROM public.user_company_roles 
        WHERE user_id = auth.uid() AND is_active = true
      )
      AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    load_id IN (
      SELECT l.id
      FROM public.loads l
      JOIN public.user_company_roles ucr ON (
        l.driver_user_id = ucr.user_id OR 
        l.created_by = ucr.user_id
      )
      WHERE ucr.company_id IN (
        SELECT company_id 
        FROM public.user_company_roles 
        WHERE user_id = auth.uid() AND is_active = true
      )
      AND ucr.is_active = true
    )
  )
);

CREATE POLICY "Users can delete load documents from their company loads" 
ON public.load_documents 
FOR DELETE 
USING (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    load_id IN (
      SELECT l.id
      FROM public.loads l
      JOIN public.user_company_roles ucr ON (
        l.driver_user_id = ucr.user_id OR 
        l.created_by = ucr.user_id
      )
      WHERE ucr.company_id IN (
        SELECT company_id 
        FROM public.user_company_roles 
        WHERE user_id = auth.uid() AND is_active = true
      )
      AND ucr.is_active = true
    )
  )
);