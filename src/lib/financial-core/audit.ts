// ===============================================
// 🚨 AUDITORÍA DE CÁLCULOS FINANCIEROS - CRÍTICO v1.0
// ⚠️ NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA
// ===============================================
//
// Este archivo implementa el sistema de auditoría para todas
// las operaciones financieras críticas del sistema.
//
// FUNCIONALIDADES:
// - Logging detallado de operaciones
// - Trazabilidad completa
// - Detección de anomalías
// - Reportes de integridad
//
// ===============================================

import { AuditRecord, FINANCIAL_CONSTANTS } from './types';
import { generateIntegrityHash } from './validation';

/**
 * Buffer en memoria para logs de auditoría
 * En producción, esto debería enviarse a una base de datos segura
 */
const auditBuffer: AuditRecord[] = [];
const MAX_BUFFER_SIZE = 1000;

/**
 * 🚨 CRÍTICO - Registra una operación financiera
 * 
 * @param operation Nombre de la operación
 * @param inputData Datos de entrada
 * @param result Resultado de la operación
 * @param error Error si ocurrió alguno
 * @param userId ID del usuario (opcional)
 */
export function logFinancialOperation(
  operation: string,
  inputData: any,
  result: any,
  error?: Error,
  userId?: string
): void {
  try {
    const timestamp = Date.now();
    
    // Crear registro de auditoría
    const auditRecord: AuditRecord = {
      operation,
      input_data: sanitizeAuditData(inputData),
      result: error ? { error: error.message, stack: error.stack } : sanitizeAuditData(result),
      timestamp,
      user_id: userId,
      integrity_hash: generateIntegrityHash({
        operation,
        inputData: sanitizeAuditData(inputData),
        result: error ? null : sanitizeAuditData(result),
        timestamp
      })
    };

    // Agregar al buffer
    auditBuffer.push(auditRecord);
    
    // Mantener el buffer dentro del límite
    if (auditBuffer.length > MAX_BUFFER_SIZE) {
      auditBuffer.shift(); // Remover el más antiguo
    }

    // Log en consola para desarrollo (en producción esto iría a un servicio de logging)
    if (error) {
      console.error(`🚨 FINANCIAL AUDIT [ERROR] - ${operation}:`, {
        input: sanitizeAuditData(inputData),
        error: error.message,
        timestamp: new Date(timestamp).toISOString(),
        hash: auditRecord.integrity_hash
      });
    } else {
      console.log(`✅ FINANCIAL AUDIT - ${operation}:`, {
        input: sanitizeAuditData(inputData),
        result: sanitizeAuditData(result),
        timestamp: new Date(timestamp).toISOString(),
        hash: auditRecord.integrity_hash
      });
    }

    // En producción, enviar a servicio de auditoría
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Aquí se enviaría a un servicio de auditoría seguro
      // sendToAuditService(auditRecord);
    }

  } catch (auditError) {
    // Si falla el logging de auditoría, no debe afectar la operación principal
    console.error('🚨 CRITICAL: Audit logging failed:', auditError);
  }
}

/**
 * 🚨 CRÍTICO - Sanitiza datos para auditoría (remueve información sensible)
 */
function sanitizeAuditData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeAuditData(item));
  }

  // Crear copia del objeto sin información sensible
  const sanitized = { ...data };
  
  // Remover campos sensibles (agregar más según sea necesario)
  const sensitiveFields = ['password', 'token', 'auth', 'private_key', 'secret'];
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * 🚨 CRÍTICO - Obtiene registros de auditoría por operación
 */
export function getAuditRecords(operation?: string, limit: number = 50): AuditRecord[] {
  try {
    let records = [...auditBuffer];
    
    if (operation) {
      records = records.filter(record => record.operation === operation);
    }
    
    // Ordenar por timestamp descendente (más recientes primero)
    records.sort((a, b) => b.timestamp - a.timestamp);
    
    return records.slice(0, limit);
  } catch (error) {
    console.error('🚨 Error retrieving audit records:', error);
    return [];
  }
}

/**
 * 🚨 CRÍTICO - Obtiene estadísticas de auditoría
 */
export function getAuditStatistics(): {
  total_operations: number;
  operations_by_type: Record<string, number>;
  error_count: number;
  success_count: number;
  last_24h_operations: number;
} {
  try {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    
    const stats = {
      total_operations: auditBuffer.length,
      operations_by_type: {} as Record<string, number>,
      error_count: 0,
      success_count: 0,
      last_24h_operations: 0
    };

    for (const record of auditBuffer) {
      // Contar por tipo de operación
      if (!stats.operations_by_type[record.operation]) {
        stats.operations_by_type[record.operation] = 0;
      }
      stats.operations_by_type[record.operation]++;

      // Contar errores vs éxitos
      if (record.result && typeof record.result === 'object' && record.result.error) {
        stats.error_count++;
      } else {
        stats.success_count++;
      }

      // Contar operaciones de las últimas 24h
      if (record.timestamp >= last24h) {
        stats.last_24h_operations++;
      }
    }

    return stats;
  } catch (error) {
    console.error('🚨 Error generating audit statistics:', error);
    return {
      total_operations: 0,
      operations_by_type: {},
      error_count: 0,
      success_count: 0,
      last_24h_operations: 0
    };
  }
}

/**
 * 🚨 CRÍTICO - Verifica la integridad de los registros de auditoría
 */
export function verifyAuditIntegrity(): {
  total_records: number;
  corrupted_records: number;
  integrity_percentage: number;
  corrupted_hashes: string[];
} {
  try {
    let corruptedCount = 0;
    const corruptedHashes: string[] = [];

    for (const record of auditBuffer) {
      // Recalcular hash para verificar integridad
      const expectedHash = generateIntegrityHash({
        operation: record.operation,
        inputData: record.input_data,
        result: record.result.error ? null : record.result,
        timestamp: record.timestamp
      });

      if (expectedHash !== record.integrity_hash) {
        corruptedCount++;
        corruptedHashes.push(record.integrity_hash);
      }
    }

    const integrityPercentage = auditBuffer.length > 0 
      ? ((auditBuffer.length - corruptedCount) / auditBuffer.length) * 100 
      : 100;

    return {
      total_records: auditBuffer.length,
      corrupted_records: corruptedCount,
      integrity_percentage: Math.round(integrityPercentage * 100) / 100,
      corrupted_hashes: corruptedHashes
    };
  } catch (error) {
    console.error('🚨 CRITICAL: Audit integrity verification failed:', error);
    return {
      total_records: auditBuffer.length,
      corrupted_records: auditBuffer.length, // Asumir todo corrupto si falla la verificación
      integrity_percentage: 0,
      corrupted_hashes: []
    };
  }
}

/**
 * 🚨 CRÍTICO - Exporta logs de auditoría para backup/análisis
 */
export function exportAuditLogs(): string {
  try {
    const exportData = {
      export_timestamp: Date.now(),
      export_version: FINANCIAL_CONSTANTS.CALCULATION_VERSION,
      total_records: auditBuffer.length,
      records: auditBuffer,
      integrity_check: verifyAuditIntegrity()
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('🚨 Error exporting audit logs:', error);
    throw new Error('Failed to export audit logs');
  }
}

/**
 * 🚨 CRÍTICO - Limpia logs antiguos (para mantenimiento)
 */
export function cleanupOldAuditLogs(olderThanDays: number = 30): number {
  try {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const initialLength = auditBuffer.length;
    
    // Filtrar registros más recientes que el cutoff
    const filteredRecords = auditBuffer.filter(record => record.timestamp >= cutoffTime);
    
    // Reemplazar el buffer
    auditBuffer.length = 0;
    auditBuffer.push(...filteredRecords);
    
    const removedCount = initialLength - auditBuffer.length;
    
    console.log(`🧹 Audit cleanup: Removed ${removedCount} old records`);
    return removedCount;
  } catch (error) {
    console.error('🚨 Error cleaning up audit logs:', error);
    return 0;
  }
}