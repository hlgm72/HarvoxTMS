-- Eliminar la invitación pendiente para hgig7274@gmail.com
DELETE FROM public.user_invitations 
WHERE email = 'hgig7274@gmail.com' 
AND accepted_at IS NULL;