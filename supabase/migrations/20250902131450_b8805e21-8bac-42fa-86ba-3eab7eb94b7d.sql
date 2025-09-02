-- ===============================================
-- 🔧 EJECUTAR RECÁLCULO MANUAL PARA VERIFICAR FUNCIÓN
-- Forzar recálculo del período problemático
-- ===============================================

-- Ejecutar el recálculo manualmente
SELECT auto_recalculate_driver_payment_period(
  '484d83b3-b928-46b3-9705-db225ddb9b0c'::UUID,
  '49cb0343-7af4-4df0-b31e-75380709c58e'::UUID
);

-- Verificar los resultados después del recálculo
SELECT 
    dpc.id,
    dpc.gross_earnings,
    dpc.fuel_expenses,
    dpc.total_deductions,
    dpc.other_income,
    dpc.total_income,
    dpc.net_payment,
    dpc.updated_at
FROM driver_period_calculations dpc 
WHERE dpc.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
AND dpc.company_payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e';