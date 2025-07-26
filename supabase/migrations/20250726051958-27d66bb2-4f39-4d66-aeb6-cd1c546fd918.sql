-- Eliminar primero los registros relacionados
DELETE FROM public.user_company_roles WHERE user_id = '6f870d79-306f-4d14-8863-aed23431a2cd';
DELETE FROM public.profiles WHERE user_id = '6f870d79-306f-4d14-8863-aed23431a2cd';

-- Eliminar el usuario de auth usando la función admin
SELECT auth.admin_delete_user('6f870d79-306f-4d14-8863-aed23431a2cd');