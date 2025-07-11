-- Create company-logos storage bucket (public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true);

-- Create storage policies for company logos
CREATE POLICY "Company logo images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'company-logos');

CREATE POLICY "Company users can upload their company logo" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.uid() IN (
    SELECT ucr.user_id 
    FROM user_company_roles ucr 
    WHERE ucr.company_id::text = (storage.foldername(name))[1]
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'senior_dispatcher')
  )
);

CREATE POLICY "Company users can update their company logo" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'company-logos' 
  AND auth.uid() IN (
    SELECT ucr.user_id 
    FROM user_company_roles ucr 
    WHERE ucr.company_id::text = (storage.foldername(name))[1]
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'senior_dispatcher')
  )
);

CREATE POLICY "Company users can delete their company logo" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'company-logos' 
  AND auth.uid() IN (
    SELECT ucr.user_id 
    FROM user_company_roles ucr 
    WHERE ucr.company_id::text = (storage.foldername(name))[1]
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'senior_dispatcher')
  )
);