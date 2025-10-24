// ===============================================
// 🚨 TIPOS DE CÁLCULOS FINANCIEROS - CRÍTICO v1.0
// ⚠️ NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA
// ===============================================
//
// Este archivo define los tipos de datos fundamentales para
// los cálculos financieros del sistema. Cualquier modificación
// puede causar errores de cálculo y pérdidas económicas.
//
// PROTECCIÓN: READONLY interfaces, validaciones estrictas
// ===============================================

/**
 * 🚨 CRÍTICO - Interfaz base para cálculos de pagos
 * Todos los valores deben ser números positivos o cero
 */
export interface PaymentCalculation {
  readonly gross_earnings: number;
  readonly other_income: number;
  readonly fuel_expenses: number;
  readonly total_deductions: number;
}

/**
 * 🚨 CRÍTICO - Interfaz para cálculo de porcentajes en cargas
 */
export interface LoadPercentageCalculation {
  readonly total_amount: number;
  readonly dispatching_percentage?: number;
  readonly factoring_percentage?: number;
  readonly leasing_percentage?: number;
}

/**
 * 🚨 CRÍTICO - Resultado de cálculo de deducciones por carga
 */
export interface LoadDeductionResult {
  readonly dispatching_amount: number;
  readonly factoring_amount: number;
  readonly leasing_amount: number;
  readonly total_deductions: number;
  readonly net_amount: number;
}

/**
 * 🚨 CRÍTICO - Interfaz para datos de combustible
 */
export interface FuelCalculation {
  readonly gallons_purchased: number;
  readonly price_per_gallon: number;
  readonly total_amount: number;
}

/**
 * 🚨 CRÍTICO - Resultado completo de cálculo financiero
 */
export interface FinancialCalculationResult {
  readonly total_income: number;
  readonly total_expenses: number;
  readonly total_deductions: number;
  readonly net_payment: number;
  readonly calculation_timestamp: number;
  readonly integrity_hash: string;
}

/**
 * 🚨 CRÍTICO - Configuración de validación
 */
export interface ValidationConfig {
  readonly min_amount: number;
  readonly max_amount: number;
  readonly allow_negative: boolean;
  readonly precision_decimals: number;
}

/**
 * 🚨 CRÍTICO - Registro de auditoría para cambios
 */
export interface AuditRecord {
  readonly operation: string;
  readonly input_data: Record<string, any>;
  readonly result: any;
  readonly timestamp: number;
  readonly user_id?: string;
  readonly integrity_hash: string;
}

/**
 * Constantes de validación inmutables
 */
export const FINANCIAL_CONSTANTS = Object.freeze({
  MAX_PERCENTAGE: 100,
  MIN_PERCENTAGE: 0,
  MAX_CURRENCY_AMOUNT: 999999.99,
  MIN_CURRENCY_AMOUNT: -999999.99,
  DECIMAL_PRECISION: 2,
  CALCULATION_VERSION: '1.0.0'
} as const);

/**
 * Estados de integridad financiera
 */
export const INTEGRITY_STATES = Object.freeze({
  VALID: 'valid',
  CORRUPTED: 'corrupted',
  TAMPERED: 'tampered',
  UNKNOWN: 'unknown'
} as const);

export type IntegrityState = typeof INTEGRITY_STATES[keyof typeof INTEGRITY_STATES];