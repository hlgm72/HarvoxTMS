-- ===============================================
-- ✅ PRUEBA FINAL: Verificar que los triggers funcionan
-- Simular edición de carga para probar recálculo automático
-- ===============================================

-- 1. Cambiar temporalmente el gross_earnings a 0 para simular estado incorrecto
UPDATE driver_period_calculations 
SET gross_earnings = 0, total_income = 0, net_payment = -221.00, updated_at = now() - INTERVAL '1 minute'
WHERE driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
AND company_payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e';

-- 2. Ejecutar la función corregida
SELECT auto_recalculate_driver_payment_period(
  '484d83b3-b928-46b3-9705-db225ddb9b0c'::UUID,
  '49cb0343-7af4-4df0-b31e-75380709c58e'::UUID
);

-- 3. Verificar que se corrigió automáticamente
SELECT 
    'PRUEBA FINAL - FUNCIÓN CORREGIDA' as status,
    dpc.gross_earnings,
    dpc.total_deductions,
    dpc.total_income,
    dpc.net_payment,
    dpc.has_negative_balance,
    dpc.updated_at
FROM driver_period_calculations dpc 
WHERE dpc.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
AND dpc.company_payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e';