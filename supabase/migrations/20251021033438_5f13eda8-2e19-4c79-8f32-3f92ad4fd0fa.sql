-- ===============================================
-- 🎯 RESTRICCIÓN ÚNICA PARCIAL PARA PORCENTAJES
-- Permitir duplicados en deducciones manuales
-- Proteger únicamente Factoring, Dispatching, Leasing
-- ===============================================

-- 1. Eliminar el constraint único actual que aplica a TODOS los tipos
ALTER TABLE expense_instances 
DROP CONSTRAINT IF EXISTS unique_period_expense_type_user;

-- 2. Crear índice único PARCIAL solo para los 3 tipos de porcentajes automáticos
-- Este índice SOLO se aplica cuando expense_type_id es uno de los 3 tipos protegidos
CREATE UNIQUE INDEX unique_period_expense_type_user_percentage_only
ON expense_instances (payment_period_id, user_id, expense_type_id)
WHERE expense_type_id IN (
  '9e5a38ae-8851-4a8c-9bc7-11ac32cb7b10',  -- Dispatching Fees
  '1a3355f5-1a3b-49d6-89b4-acc7f259ebdb',  -- Factoring Fees  
  '28d59af7-c756-40bf-885e-fb995a744003'   -- Leasing Fees
);

-- 3. Agregar comentario explicativo
COMMENT ON INDEX unique_period_expense_type_user_percentage_only IS 
'Índice único parcial que SOLO previene duplicados de los 3 tipos de porcentajes automáticos (Factoring, Dispatching, Leasing). Todos los demás tipos de gastos (Insurance, Cash Advance, etc.) pueden tener múltiples instancias por período.';