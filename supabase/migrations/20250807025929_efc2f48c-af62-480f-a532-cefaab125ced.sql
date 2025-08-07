-- Check if load-documents bucket exists and create it if needed
INSERT INTO storage.buckets (id, name, public) 
VALUES ('load-documents', 'load-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for load-documents bucket
CREATE POLICY "Users can upload load documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'load-documents' AND
  ((SELECT auth.role()) = 'authenticated' AND 
   (SELECT auth.uid()) IS NOT NULL AND 
   COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false)
);

CREATE POLICY "Users can view their company's load documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'load-documents' AND
  ((SELECT auth.role()) = 'authenticated' AND 
   (SELECT auth.uid()) IS NOT NULL AND 
   COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false) AND
  (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their company's load documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'load-documents' AND
  ((SELECT auth.role()) = 'authenticated' AND 
   (SELECT auth.uid()) IS NOT NULL AND 
   COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false) AND
  (SELECT auth.uid())::text = (storage.foldername(name))[1]
) WITH CHECK (
  bucket_id = 'load-documents' AND
  ((SELECT auth.role()) = 'authenticated' AND 
   (SELECT auth.uid()) IS NOT NULL AND 
   COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false) AND
  (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their company's load documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'load-documents' AND
  ((SELECT auth.role()) = 'authenticated' AND 
   (SELECT auth.uid()) IS NOT NULL AND 
   COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false) AND
  (SELECT auth.uid())::text = (storage.foldername(name))[1]
);