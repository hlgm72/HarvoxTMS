// ===============================================
// 🚨 CÁLCULOS FINANCIEROS PROTEGIDOS - CRÍTICO v1.0
// ⚠️ NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA
// ===============================================
//
// Este archivo contiene TODAS las funciones matemáticas críticas
// del sistema financiero. Cada función está blindada con:
// - Validaciones de entrada
// - Verificación de integridad
// - Logs de auditoría
// - Manejo de errores robusto
//
// CUALQUIER MODIFICACIÓN DEBE SER APROBADA Y TESTEADA
// ===============================================

import {
  PaymentCalculation,
  LoadPercentageCalculation,
  LoadDeductionResult,
  FuelCalculation,
  FinancialCalculationResult,
  FINANCIAL_CONSTANTS
} from './types';

import {
  validatePaymentCalculation,
  validateLoadPercentageCalculation,
  validateFuelCalculation,
  roundCurrency,
  generateIntegrityHash
} from './validation';

import { logFinancialOperation } from './audit';

// ❌ calculateTotalIncome() ELIMINADO - Ya no es necesario
// El cálculo se hace directamente en calculateNetPayment()

/**
 * 🚨 CRÍTICO - Calcula el pago neto
 * Fórmula: net_payment = (gross_earnings + other_income) - fuel_expenses - total_deductions
 * 
 * ESTA ES LA FUNCIÓN MÁS CRÍTICA DEL SISTEMA
 * 
 * @param calculation Datos de cálculo validados
 * @returns Pago neto redondeado
 */
export function calculateNetPayment(calculation: PaymentCalculation): number {
  const operation = 'calculateNetPayment';
  
  try {
    // Validar entrada
    if (!validatePaymentCalculation(calculation)) {
      throw new Error('Invalid payment calculation data');
    }

    // 🎯 CÁLCULO DIRECTO: net_payment = gross_earnings + other_income - fuel_expenses - total_deductions
    const result = roundCurrency(
      (calculation.gross_earnings || 0) + 
      (calculation.other_income || 0) - 
      (calculation.fuel_expenses || 0) - 
      (calculation.total_deductions || 0)
    );

    // Log de auditoría
    logFinancialOperation(operation, calculation, result);

    return result;
  } catch (error) {
    console.error(`🚨 CRITICAL ERROR in ${operation}:`, error);
    logFinancialOperation(operation, calculation, null, error as Error);
    throw new Error(`CRITICAL: Net payment calculation failed`);
  }
}

/**
 * 🚨 CRÍTICO - Verifica si el balance es negativo
 * 
 * @param calculation Datos de cálculo validados
 * @returns true si el balance es negativo
 */
export function calculateHasNegativeBalance(calculation: PaymentCalculation): boolean {
  const operation = 'calculateHasNegativeBalance';
  
  try {
    const netPayment = calculateNetPayment(calculation);
    const result = netPayment < 0;
    
    logFinancialOperation(operation, calculation, result);
    return result;
  } catch (error) {
    console.error(`🚨 Error in ${operation}:`, error);
    logFinancialOperation(operation, calculation, null, error as Error);
    throw error; // Re-throw porque depende de calculateNetPayment
  }
}

/**
 * 🚨 CRÍTICO - Calcula deducciones por porcentajes en cargas
 * 
 * @param load Datos de la carga con porcentajes
 * @returns Resultado detallado de deducciones
 */
export function calculateLoadDeductions(load: LoadPercentageCalculation): LoadDeductionResult {
  const operation = 'calculateLoadDeductions';
  
  try {
    // Validar entrada
    if (!validateLoadPercentageCalculation(load)) {
      throw new Error('Invalid load percentage calculation data');
    }

    // Calcular cada tipo de deducción
    const dispatchingAmount = roundCurrency(
      (load.total_amount * (load.dispatching_percentage || 0)) / 100
    );
    
    const factoringAmount = roundCurrency(
      (load.total_amount * (load.factoring_percentage || 0)) / 100
    );
    
    const leasingAmount = roundCurrency(
      (load.total_amount * (load.leasing_percentage || 0)) / 100
    );

    // Calcular totales
    const totalDeductions = roundCurrency(
      dispatchingAmount + factoringAmount + leasingAmount
    );
    
    const netAmount = roundCurrency(load.total_amount - totalDeductions);

    const result: LoadDeductionResult = {
      dispatching_amount: dispatchingAmount,
      factoring_amount: factoringAmount,
      leasing_amount: leasingAmount,
      total_deductions: totalDeductions,
      net_amount: netAmount
    };

    logFinancialOperation(operation, load, result);
    return result;
  } catch (error) {
    console.error(`🚨 Error in ${operation}:`, error);
    logFinancialOperation(operation, load, null, error as Error);
    throw new Error(`Load deductions calculation failed: ${operation}`);
  }
}

/**
 * 🚨 CRÍTICO - Valida y calcula total de gasto de combustible
 * 
 * @param fuel Datos del combustible
 * @returns Total validado y redondeado
 */
export function calculateFuelTotal(fuel: FuelCalculation): number {
  const operation = 'calculateFuelTotal';
  
  try {
    // Validar entrada
    if (!validateFuelCalculation(fuel)) {
      throw new Error('Invalid fuel calculation data');
    }

    // El total ya está validado en validateFuelCalculation
    const result = roundCurrency(fuel.total_amount);
    
    logFinancialOperation(operation, fuel, result);
    return result;
  } catch (error) {
    console.error(`🚨 Error in ${operation}:`, error);
    logFinancialOperation(operation, fuel, null, error as Error);
    throw new Error(`Fuel calculation failed: ${operation}`);
  }
}

/**
 * 🚨 CRÍTICO - Realiza un cálculo financiero completo con integridad
 * 
 * @param calculation Datos base del cálculo
 * @returns Resultado completo con verificación de integridad
 */
export function calculateCompleteFinancialResult(calculation: PaymentCalculation): FinancialCalculationResult {
  const operation = 'calculateCompleteFinancialResult';
  
  try {
    // Validar entrada
    if (!validatePaymentCalculation(calculation)) {
      throw new Error('Invalid payment calculation data');
    }

    // Calcular todos los componentes
    const totalIncome = roundCurrency(
      (calculation.gross_earnings || 0) + (calculation.other_income || 0)
    );
    const totalExpenses = roundCurrency(calculation.fuel_expenses + calculation.total_deductions);
    const netPayment = calculateNetPayment(calculation);
    const hasNegativeBalance = calculateHasNegativeBalance(calculation);

    // Crear resultado
    const result: FinancialCalculationResult = {
      total_income: totalIncome,  // Calculado localmente para display
      total_expenses: totalExpenses,
      total_deductions: calculation.total_deductions,
      net_payment: netPayment,
      calculation_timestamp: Date.now(),
      integrity_hash: ''
    };

    // Generar hash de integridad 
    const resultWithHash = {
      ...result,
      integrity_hash: generateIntegrityHash(result)
    };

    logFinancialOperation(operation, calculation, resultWithHash);
    return resultWithHash;
  } catch (error) {
    console.error(`🚨 CRITICAL ERROR in ${operation}:`, error);
    logFinancialOperation(operation, calculation, null, error as Error);
    throw new Error(`CRITICAL: Complete financial calculation failed`);
  }
}

/**
 * 🚨 CRÍTICO - Suma múltiples cálculos de pago (para resúmenes de período)
 * 
 * @param calculations Array de cálculos individuales
 * @returns Totales agregados
 */
export function calculateAggregatedTotals(calculations: PaymentCalculation[]): PaymentCalculation {
  const operation = 'calculateAggregatedTotals';
  
  try {
    if (!Array.isArray(calculations) || calculations.length === 0) {
      throw new Error('Invalid calculations array');
    }

    // Validar cada cálculo individual
    for (const calc of calculations) {
      if (!validatePaymentCalculation(calc)) {
        throw new Error('Invalid calculation in array');
      }
    }

    // Sumar todos los componentes
    const result: PaymentCalculation = {
      gross_earnings: roundCurrency(
        calculations.reduce((sum, calc) => sum + (calc.gross_earnings || 0), 0)
      ),
      other_income: roundCurrency(
        calculations.reduce((sum, calc) => sum + (calc.other_income || 0), 0)
      ),
      fuel_expenses: roundCurrency(
        calculations.reduce((sum, calc) => sum + (calc.fuel_expenses || 0), 0)
      ),
      total_deductions: roundCurrency(
        calculations.reduce((sum, calc) => sum + (calc.total_deductions || 0), 0)
      )
    };

    logFinancialOperation(operation, { count: calculations.length }, result);
    return result;
  } catch (error) {
    console.error(`🚨 Error in ${operation}:`, error);
    logFinancialOperation(operation, { count: calculations?.length || 0 }, null, error as Error);
    throw new Error(`Aggregated totals calculation failed: ${operation}`);
  }
}

// Las funciones ya están exportadas individualmente arriba