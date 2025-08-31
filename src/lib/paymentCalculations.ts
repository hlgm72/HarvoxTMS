// ===============================================
// 🚨 SISTEMA DE CÁLCULOS DE PAGOS - CRÍTICO v1.0
// ⚠️ NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA
// ===============================================
// 
// Esta biblioteca contiene las funciones matemáticas fundamentales
// para el cálculo de pagos a conductores. Cualquier error puede
// causar pagos incorrectos y pérdidas económicas.
// 
// Ver: docs/CRITICAL-BUSINESS-LOGIC-PROTECTION.md

// Utility functions for dynamic payment calculations
// Eliminamos redundancia de datos calculando valores dinámicamente

export interface PaymentCalculation {
  gross_earnings: number;
  other_income: number;
  fuel_expenses: number;
  total_deductions: number;
}

/**
 * 🚨 CRÍTICO - Calcula el total de ingresos dinámicamente
 * total_income = gross_earnings + other_income
 * NO MODIFICAR SIN AUTORIZACIÓN
 */
export function calculateTotalIncome(calculation: PaymentCalculation): number {
  return (calculation.gross_earnings || 0) + (calculation.other_income || 0);
}

/**
 * 🚨 CRÍTICO - Calcula el pago neto dinámicamente
 * net_payment = (gross_earnings + other_income) - fuel_expenses - total_deductions
 * NO MODIFICAR SIN AUTORIZACIÓN - ESTA ES LA FUNCIÓN MÁS CRÍTICA
 */
export function calculateNetPayment(calculation: PaymentCalculation): number {
  const totalIncome = calculateTotalIncome(calculation);
  return totalIncome - (calculation.fuel_expenses || 0) - (calculation.total_deductions || 0);
}

/**
 * 🚨 CRÍTICO - Calcula si el balance es negativo
 * NO MODIFICAR SIN AUTORIZACIÓN
 */
export function calculateHasNegativeBalance(calculation: PaymentCalculation): boolean {
  return calculateNetPayment(calculation) < 0;
}