-- Restaurar los roles faltantes de Hector Gonzalez
-- Primero verificamos qué roles tiene actualmente

-- Insertar el rol de Dispatcher que se eliminó incorrectamente
INSERT INTO user_company_roles (
  user_id,
  company_id,
  role,
  is_active,
  delegated_by,
  delegated_at,
  created_at
) VALUES (
  '087a825c-94ea-42d9-8388-5087a19d776f',
  'e5d52767-ca59-4c28-94e4-058aff6a037b',
  'dispatcher',
  true,
  '087a825c-94ea-42d9-8388-5087a19d776f',
  now(),
  now()
)
ON CONFLICT DO NOTHING;

-- Insertar el rol de Driver que se eliminó incorrectamente  
INSERT INTO user_company_roles (
  user_id,
  company_id,
  role,
  is_active,
  delegated_by,
  delegated_at,
  created_at
) VALUES (
  '087a825c-94ea-42d9-8388-5087a19d776f',
  'e5d52767-ca59-4c28-94e4-058aff6a037b',
  'driver',
  true,
  '087a825c-94ea-42d9-8388-5087a19d776f',
  now(),
  now()
)
ON CONFLICT DO NOTHING;

-- Eliminar el índice incorrecto que creé
DROP INDEX IF EXISTS unique_user_company_role_active_idx;