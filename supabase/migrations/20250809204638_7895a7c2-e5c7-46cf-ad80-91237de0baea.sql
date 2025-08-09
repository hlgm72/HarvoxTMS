-- Reactivar los roles inactivos de Hector Gonzalez
UPDATE user_company_roles 
SET is_active = true, updated_at = now()
WHERE user_id = '087a825c-94ea-42d9-8388-5087a19d776f'
  AND company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND role IN ('dispatcher', 'driver')
  AND is_active = false;

-- Verificar que ahora tiene los tres roles activos
SELECT ucr.role, ucr.is_active, au.email
FROM user_company_roles ucr
LEFT JOIN auth.users au ON ucr.user_id = au.id
WHERE ucr.user_id = '087a825c-94ea-42d9-8388-5087a19d776f'
  AND ucr.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
ORDER BY ucr.role;