// ===============================================
// 🚨 VALIDACIÓN DE CÁLCULOS FINANCIEROS - CRÍTICO v1.0
// ⚠️ NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA
// ===============================================
//
// Este archivo contiene las funciones de validación para
// garantizar la integridad de los cálculos financieros.
//
// PROTECCIÓN: Checksums, validaciones matemáticas estrictas
// ===============================================

import { 
  PaymentCalculation, 
  LoadPercentageCalculation, 
  FuelCalculation, 
  ValidationConfig,
  FINANCIAL_CONSTANTS,
  IntegrityState,
  INTEGRITY_STATES
} from './types';

/**
 * 🚨 CRÍTICO - Valida una estructura de cálculo de pago
 */
export function validatePaymentCalculation(calc: PaymentCalculation): boolean {
  try {
    // Verificar que todos los campos existen y son números
    if (typeof calc.gross_earnings !== 'number' || isNaN(calc.gross_earnings)) return false;
    if (typeof calc.other_income !== 'number' || isNaN(calc.other_income)) return false;
    if (typeof calc.fuel_expenses !== 'number' || isNaN(calc.fuel_expenses)) return false;
    if (typeof calc.total_deductions !== 'number' || isNaN(calc.total_deductions)) return false;

    // Verificar rangos válidos
    const values = [calc.gross_earnings, calc.other_income, calc.fuel_expenses, calc.total_deductions];
    for (const value of values) {
      if (value < FINANCIAL_CONSTANTS.MIN_CURRENCY_AMOUNT || 
          value > FINANCIAL_CONSTANTS.MAX_CURRENCY_AMOUNT) {
        return false;
      }
    }

    // Verificar que ingresos no sean negativos
    if (calc.gross_earnings < 0 || calc.other_income < 0) return false;

    // Verificar que gastos no sean negativos
    if (calc.fuel_expenses < 0 || calc.total_deductions < 0) return false;

    return true;
  } catch (error) {
    console.error('🚨 Error validating payment calculation:', error);
    return false;
  }
}

/**
 * 🚨 CRÍTICO - Valida cálculo de porcentajes en cargas
 */
export function validateLoadPercentageCalculation(calc: LoadPercentageCalculation): boolean {
  try {
    // Validar monto total
    if (typeof calc.total_amount !== 'number' || isNaN(calc.total_amount) || calc.total_amount < 0) {
      return false;
    }

    // Validar porcentajes si existen
    const percentages = [
      calc.dispatching_percentage,
      calc.factoring_percentage,
      calc.leasing_percentage
    ].filter(p => p !== undefined);

    for (const percentage of percentages) {
      if (typeof percentage !== 'number' || 
          isNaN(percentage) ||
          percentage < FINANCIAL_CONSTANTS.MIN_PERCENTAGE ||
          percentage > FINANCIAL_CONSTANTS.MAX_PERCENTAGE) {
        return false;
      }
    }

    // Verificar que la suma de porcentajes no exceda 100%
    const totalPercentage = percentages.reduce((sum, p) => sum + (p || 0), 0);
    if (totalPercentage > FINANCIAL_CONSTANTS.MAX_PERCENTAGE) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('🚨 Error validating load percentage calculation:', error);
    return false;
  }
}

/**
 * 🚨 CRÍTICO - Valida cálculo de combustible
 */
export function validateFuelCalculation(calc: FuelCalculation): boolean {
  try {
    // Verificar que todos los campos son números válidos
    if (typeof calc.gallons_purchased !== 'number' || isNaN(calc.gallons_purchased) || calc.gallons_purchased < 0) {
      return false;
    }
    if (typeof calc.price_per_gallon !== 'number' || isNaN(calc.price_per_gallon) || calc.price_per_gallon < 0) {
      return false;
    }
    if (typeof calc.total_amount !== 'number' || isNaN(calc.total_amount) || calc.total_amount < 0) {
      return false;
    }

    // Verificar consistencia matemática: gallons * price ≈ total
    const expectedTotal = Number((calc.gallons_purchased * calc.price_per_gallon).toFixed(FINANCIAL_CONSTANTS.DECIMAL_PRECISION));
    const actualTotal = Number(calc.total_amount.toFixed(FINANCIAL_CONSTANTS.DECIMAL_PRECISION));
    
    // Permitir una diferencia mínima por redondeo
    const difference = Math.abs(expectedTotal - actualTotal);
    if (difference > 0.01) {
      console.warn('🚨 Fuel calculation inconsistency:', {
        expected: expectedTotal,
        actual: actualTotal,
        difference
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('🚨 Error validating fuel calculation:', error);
    return false;
  }
}

/**
 * 🚨 CRÍTICO - Redondea valores monetarios a la precisión correcta
 */
export function roundCurrency(value: number): number {
  return Number(value.toFixed(FINANCIAL_CONSTANTS.DECIMAL_PRECISION));
}

/**
 * 🚨 CRÍTICO - Valida que un valor está dentro del rango monetario permitido
 */
export function isValidCurrencyAmount(amount: number): boolean {
  return typeof amount === 'number' && 
         !isNaN(amount) && 
         amount >= FINANCIAL_CONSTANTS.MIN_CURRENCY_AMOUNT && 
         amount <= FINANCIAL_CONSTANTS.MAX_CURRENCY_AMOUNT;
}

/**
 * 🚨 CRÍTICO - Genera un hash de integridad para un objeto
 */
export function generateIntegrityHash(data: any): string {
  try {
    // Crear una representación estable del objeto
    const stableString = JSON.stringify(data, Object.keys(data).sort());
    
    // Generar un hash simple pero efectivo
    let hash = 0;
    for (let i = 0; i < stableString.length; i++) {
      const char = stableString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  } catch (error) {
    console.error('🚨 Error generating integrity hash:', error);
    return 'CORRUPTED';
  }
}

/**
 * 🚨 CRÍTICO - Verifica la integridad de un cálculo
 */
export function verifyCalculationIntegrity(calculation: any, expectedHash: string): IntegrityState {
  try {
    const currentHash = generateIntegrityHash(calculation);
    
    if (currentHash === 'CORRUPTED') {
      return INTEGRITY_STATES.CORRUPTED;
    }
    
    if (currentHash === expectedHash) {
      return INTEGRITY_STATES.VALID;
    }
    
    return INTEGRITY_STATES.TAMPERED;
  } catch (error) {
    console.error('🚨 Error verifying calculation integrity:', error);
    return INTEGRITY_STATES.UNKNOWN;
  }
}

/**
 * 🚨 CRÍTICO - Configuración de validación por defecto
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = Object.freeze({
  min_amount: FINANCIAL_CONSTANTS.MIN_CURRENCY_AMOUNT,
  max_amount: FINANCIAL_CONSTANTS.MAX_CURRENCY_AMOUNT,
  allow_negative: false,
  precision_decimals: FINANCIAL_CONSTANTS.DECIMAL_PRECISION
});