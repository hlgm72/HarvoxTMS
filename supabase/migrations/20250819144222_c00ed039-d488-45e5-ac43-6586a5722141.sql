-- Clean up duplicate storage policies for load documents
DROP POLICY IF EXISTS "Load documents delete access" ON storage.objects;
DROP POLICY IF EXISTS "Load documents update access" ON storage.objects;
DROP POLICY IF EXISTS "Load documents upload access" ON storage.objects;
DROP POLICY IF EXISTS "Load documents view access" ON storage.objects;

-- Also remove any remaining old policies
DROP POLICY IF EXISTS "Users can upload files for their loads" ON storage.objects;