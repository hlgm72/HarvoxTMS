// ===============================================
// 🚨 ÍNDICE DE CÁLCULOS FINANCIEROS PROTEGIDOS - CRÍTICO v1.0
// ⚠️ NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA
// ===============================================
//
// Este es el único punto de entrada autorizado para todas las
// funciones de cálculo financiero del sistema.
//
// CARACTERÍSTICAS DE SEGURIDAD:
// ✅ Funciones blindadas con validaciones
// ✅ Sistema de auditoría completo
// ✅ Verificación de integridad automática
// ✅ Logs detallados de todas las operaciones
// ✅ Detección de modificaciones no autorizadas
//
// IMPORTACIÓN SEGURA:
// ❌ NO IMPORTAR: import { calculateNetPayment } from '@/lib/paymentCalculations'
// ✅ SÍ IMPORTAR: import { calculateNetPayment } from '@/lib/financial-core'
//
// ===============================================

// ===============================================
// EXPORTACIONES PRINCIPALES - FUNCIONES CRÍTICAS
// ===============================================

// Funciones de cálculo principal (blindadas)
export {
  // calculateTotalIncome, // ❌ ELIMINADO - Ya no existe
  calculateNetPayment,
  calculateHasNegativeBalance,
  calculateLoadDeductions,
  calculateFuelTotal,
  calculateCompleteFinancialResult,
  calculateAggregatedTotals
} from './calculations';

// ===============================================
// EXPORTACIONES DE VALIDACIÓN Y SEGURIDAD
// ===============================================

// Funciones de validación
export {
  validatePaymentCalculation,
  validateLoadPercentageCalculation,
  validateFuelCalculation,
  roundCurrency,
  isValidCurrencyAmount,
  generateIntegrityHash,
  verifyCalculationIntegrity,
  DEFAULT_VALIDATION_CONFIG
} from './validation';

// ===============================================
// EXPORTACIONES DE AUDITORÍA
// ===============================================

// Sistema de auditoría
export {
  logFinancialOperation,
  getAuditRecords,
  getAuditStatistics,
  verifyAuditIntegrity,
  exportAuditLogs,
  cleanupOldAuditLogs
} from './audit';

// ===============================================
// EXPORTACIONES DE INTEGRIDAD Y MONITOREO
// ===============================================

// Verificación de integridad
export {
  verifyCalculationConsistency,
  generateIntegrityReport,
  startIntegrityMonitoring,
  validateFunctionIntegrity
} from './integrity';

// ===============================================
// EXPORTACIONES DE TIPOS
// ===============================================

// Tipos e interfaces
export type {
  PaymentCalculation,
  LoadPercentageCalculation,
  LoadDeductionResult,
  FuelCalculation,
  FinancialCalculationResult,
  ValidationConfig,
  AuditRecord,
  IntegrityState
} from './types';

// Constantes
export {
  FINANCIAL_CONSTANTS,
  INTEGRITY_STATES
} from './types';

// ===============================================
// FUNCIONES DE UTILIDAD PARA MIGRACIÓN
// ===============================================

/**
 * 🚨 CRÍTICO - Inicializa el sistema de cálculos financieros protegidos
 * Debe llamarse una vez al inicio de la aplicación
 */
export async function initializeFinancialCore(): Promise<boolean> {
  try {
    console.log('🔒 Initializing Financial Core System...');
    
    // Verificar integridad de las funciones
    const integrityModule = await import('./integrity');
    const integrityCheck = await integrityModule.verifyCalculationIntegrity();
    
    if (integrityCheck.status !== 'valid') {
      console.error('🚨 CRITICAL: Financial Core initialization failed - integrity check failed!');
      return false;
    }

    // Inicializar monitoreo (solo en producción)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      integrityModule.startIntegrityMonitoring(60); // Monitorear cada hora
    }

    console.log('✅ Financial Core System initialized successfully');
    console.log('🔒 All calculation functions are protected and monitored');
    
    return true;
  } catch (error) {
    console.error('🚨 CRITICAL ERROR: Financial Core initialization failed:', error);
    return false;
  }
}

/**
 * 🚨 CRÍTICO - Ejecuta diagnóstico completo del sistema financiero
 * Útil para troubleshooting y mantenimiento
 */
export async function runFinancialDiagnostic(): Promise<any> {
  try {
    console.log('🔍 Running Financial System Diagnostic...');
    
    const integrityModule = await import('./integrity');
    const auditModule = await import('./audit');
    const { FINANCIAL_CONSTANTS } = await import('./types');
    
    const report = {
      timestamp: Date.now(),
      system_version: FINANCIAL_CONSTANTS.CALCULATION_VERSION,
      integrity_report: await integrityModule.generateIntegrityReport(),
      audit_statistics: auditModule.getAuditStatistics(),
      audit_integrity: auditModule.verifyAuditIntegrity()
    };

    console.log('📊 Financial System Diagnostic Complete:', report);
    return report;
  } catch (error) {
    console.error('🚨 Error running financial diagnostic:', error);
    throw error;
  }
}

/**
 * ⚠️ FUNCIÓN DE COMPATIBILIDAD - Usar solo durante migración
 * Esta función permite usar las funciones antiguas mientras se migra el código
 * ELIMINAR después de completar la migración
 */
export function createCompatibilityLayer() {
  console.warn('⚠️ Using compatibility layer - this should be removed after migration');
  
  // Importar las funciones dinámicamente para evitar referencias directas
  return import('./calculations').then(module => ({
    calculateNetPayment: module.calculateNetPayment,
    // calculateTotalIncome: module.calculateTotalIncome, // ❌ ELIMINADO
    calculateHasNegativeBalance: module.calculateHasNegativeBalance
  }));
}

// ===============================================
// INFORMACIÓN DEL SISTEMA
// ===============================================

export const FINANCIAL_CORE_INFO = Object.freeze({
  version: '2.0.0',
  last_updated: '2025-02-11',
  security_level: 'CRITICAL',
  protected_functions: [
    // 'calculateTotalIncome', // ❌ ELIMINADO en v2.0
    'calculateNetPayment', 
    'calculateHasNegativeBalance',
    'calculateLoadDeductions',
    'calculateFuelTotal'
  ],
  documentation: 'docs/FINANCIAL_CALCULATIONS_PROTECTION.md'
} as const);

console.log('🔒 Financial Core Module Loaded', FINANCIAL_CORE_INFO);