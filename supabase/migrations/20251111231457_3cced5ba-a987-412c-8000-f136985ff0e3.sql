-- =====================================================
-- MIGRACIÓN: Hacer bucket load-documents PRIVADO
-- y crear función auxiliar para company_id
-- =====================================================

-- 1. Hacer el bucket privado (si existe, actualizarlo; si no existe, crearlo)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'load-documents';

-- Si el bucket no existe, crearlo como privado
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('load-documents', 'load-documents', false, 52428800, ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
ON CONFLICT (id) DO UPDATE 
SET public = false,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png', 
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

-- 2. Crear función auxiliar para obtener company_id del usuario
CREATE OR REPLACE FUNCTION public.get_user_company_id(user_id_param uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id 
  FROM user_company_roles 
  WHERE user_id = user_id_param 
    AND is_active = true 
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_company_id IS 
'Obtiene el company_id del usuario basado en su rol activo';