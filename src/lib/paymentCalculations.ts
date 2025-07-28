// Utility functions for dynamic payment calculations
// Eliminamos redundancia de datos calculando valores dinámicamente

export interface PaymentCalculation {
  gross_earnings: number;
  other_income: number;
  fuel_expenses: number;
  total_deductions: number;
}

/**
 * Calcula el total de ingresos dinámicamente
 * total_income = gross_earnings + other_income
 */
export function calculateTotalIncome(calculation: PaymentCalculation): number {
  return (calculation.gross_earnings || 0) + (calculation.other_income || 0);
}

/**
 * Calcula el pago neto dinámicamente
 * net_payment = (gross_earnings + other_income) - fuel_expenses - total_deductions
 */
export function calculateNetPayment(calculation: PaymentCalculation): number {
  const totalIncome = calculateTotalIncome(calculation);
  return totalIncome - (calculation.fuel_expenses || 0) - (calculation.total_deductions || 0);
}

/**
 * Calcula si el balance es negativo
 */
export function calculateHasNegativeBalance(calculation: PaymentCalculation): boolean {
  return calculateNetPayment(calculation) < 0;
}

/**
 * Formatea un monto como moneda
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('es-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2 
  });
}

/**
 * Versión simplificada sin símbolo de moneda
 */
export function formatAmount(amount: number): string {
  return amount.toLocaleString('es-US', { minimumFractionDigits: 2 });
}