-- Eliminar los roles del usuario
DELETE FROM public.user_company_roles WHERE user_id = '6f870d79-306f-4d14-8863-aed23431a2cd';

-- Eliminar el perfil del usuario  
DELETE FROM public.profiles WHERE user_id = '6f870d79-306f-4d14-8863-aed23431a2cd';

-- Eliminar cualquier invitación pendiente para ese email
DELETE FROM public.user_invitations WHERE email = 'hgig7274@gmail.com';