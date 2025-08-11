-- Agregar a Diosvani como conductor activo en HG Transport LLC
-- El usuario ya existe y tiene profiles y driver_profiles, solo faltan los roles y owner_operators

-- Primero, agregar el rol de conductor en HG Transport LLC
INSERT INTO user_company_roles (
  user_id,
  company_id,
  role,
  is_active,
  assigned_by
) VALUES (
  '484d83b3-b928-46b3-9705-db225ddb9b0c', -- Diosvani's user_id
  'e5d52767-ca59-4c28-94e4-058aff6a037b', -- HG Transport LLC company_id
  'driver',
  true,
  (SELECT user_id FROM user_company_roles WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b' AND role = 'company_owner' AND is_active = true LIMIT 1)
);

-- Después, crear el registro de owner_operators
INSERT INTO owner_operators (
  user_id,
  company_id,
  operator_type,
  is_active
) VALUES (
  '484d83b3-b928-46b3-9705-db225ddb9b0c', -- Diosvani's user_id
  'e5d52767-ca59-4c28-94e4-058aff6a037b', -- HG Transport LLC company_id
  'company_driver',
  true
);

-- Verificar que los registros se crearon correctamente
SELECT 
  'user_company_roles' as table_name,
  ucr.user_id,
  ucr.company_id,
  c.name as company_name,
  ucr.role,
  ucr.is_active
FROM user_company_roles ucr
JOIN companies c ON ucr.company_id = c.id
WHERE ucr.user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'

UNION ALL

SELECT 
  'owner_operators' as table_name,
  oo.user_id,
  oo.company_id,
  c.name as company_name,
  oo.operator_type,
  oo.is_active
FROM owner_operators oo
JOIN companies c ON oo.company_id = c.id
WHERE oo.user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c';