-- Eliminar solo los VERDADEROS duplicados (mismo usuario, empresa Y rol)
-- Mantener el más reciente de cada rol específico

WITH true_duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, company_id, role, is_active
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM user_company_roles
  WHERE user_id = '087a825c-94ea-42d9-8388-5087a19d776f'
    AND company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
)
DELETE FROM user_company_roles
WHERE id IN (
  SELECT id FROM true_duplicates WHERE rn > 1
);

-- Verificar resultado final
SELECT ucr.role, ucr.is_active, ucr.created_at, au.email
FROM user_company_roles ucr
LEFT JOIN auth.users au ON ucr.user_id = au.id
WHERE ucr.user_id = '087a825c-94ea-42d9-8388-5087a19d776f'
  AND ucr.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
ORDER BY ucr.role;