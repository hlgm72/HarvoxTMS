-- ARREGLAR: Recalcular correctamente los gross_earnings de la semana 34
-- Solo debe incluir cargas delivered del período específico

-- Actualizar manualmente el cálculo de Héctor González para la semana 34
UPDATE driver_period_calculations 
SET 
  gross_earnings = 2200.00,  -- Solo las 2 cargas: $1,100 + $1,100
  total_income = 2200.00,    -- Mismo valor si no hay other_income
  net_payment = 2200.00 - fuel_expenses - total_deductions,  -- Recalcular net payment
  updated_at = now()
WHERE id = 'abce6bae-269e-4699-8b81-683dcf0faa68'  -- El ID del cálculo de Héctor semana 34
  AND driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
  AND company_payment_period_id = 'c4a48585-f5d1-473f-91b8-5bd965417fc4';