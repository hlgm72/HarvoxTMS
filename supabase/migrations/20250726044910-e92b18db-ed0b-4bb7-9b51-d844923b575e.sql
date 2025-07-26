-- Eliminar la invitación usada para poder crear una nueva
DELETE FROM public.user_invitations 
WHERE email = 'hgig7274@gmail.com';

-- También eliminar el rol del usuario si existe
DELETE FROM public.user_company_roles 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'hgig7274@gmail.com'
) AND role = 'driver';