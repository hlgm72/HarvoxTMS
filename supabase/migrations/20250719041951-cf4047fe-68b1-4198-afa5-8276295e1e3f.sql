-- Create storage bucket for load documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('load-documents', 'load-documents', false);

-- Create storage policies for load documents
CREATE POLICY "Users can view load documents they have access to" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'load-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT l.id::text
    FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT get_user_company_roles.company_id
      FROM get_user_company_roles(auth.uid()) get_user_company_roles(company_id, role)
    ) AND ucr.is_active = true
  )
);

CREATE POLICY "Users can upload load documents for accessible loads" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'load-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT l.id::text
    FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT get_user_company_roles.company_id
      FROM get_user_company_roles(auth.uid()) get_user_company_roles(company_id, role)
    ) AND ucr.is_active = true
  )
);

CREATE POLICY "Users can update load documents for accessible loads" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'load-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT l.id::text
    FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT get_user_company_roles.company_id
      FROM get_user_company_roles(auth.uid()) get_user_company_roles(company_id, role)
    ) AND ucr.is_active = true
  )
);

CREATE POLICY "Users can delete load documents for accessible loads" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'load-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT l.id::text
    FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT get_user_company_roles.company_id
      FROM get_user_company_roles(auth.uid()) get_user_company_roles(company_id, role)
    ) AND ucr.is_active = true
  )
);