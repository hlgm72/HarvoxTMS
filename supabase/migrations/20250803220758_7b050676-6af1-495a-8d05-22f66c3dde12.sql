-- Corregir advertencia de seguridad: eliminar acceso anónimo a profiles

-- Eliminar la política problemática
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;

-- Crear políticas más específicas y seguras solo para usuarios autenticados
CREATE POLICY "Authenticated users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  user_id = (SELECT auth.uid())
);

CREATE POLICY "Authenticated users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  user_id = (SELECT auth.uid())
);

CREATE POLICY "Authenticated users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  user_id = (SELECT auth.uid())
);