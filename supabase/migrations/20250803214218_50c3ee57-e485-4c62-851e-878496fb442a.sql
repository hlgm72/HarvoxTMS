-- ELIMINAR SOLO ÍNDICES QUE NO SON FOREIGN KEYS
-- Verificados como seguros - no son FKs reales

-- Este es solo una columna de estado (char), no una FK real
DROP INDEX IF EXISTS idx_driver_profiles_license_state;

-- NOTA: Los demás índices "unused" son todos para foreign keys y deben mantenerse:
-- - paid_by, created_by, driver_user_id, etc. → FK a usuarios  
-- - expense_type_id → FK a expense_types
-- - vehicle_id → FK a vehículos
-- - client_contact_id → FK a client contacts
-- - payment_method_id → FK a payment_methods
-- - payment_period_id → FK a payment_periods
-- - company_id → FK a companies
-- - etc.

-- Eliminar solo 1 índice que es realmente innecesario
-- Los otros 20+ son obligatorios para foreign keys