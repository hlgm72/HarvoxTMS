import { toast } from "sonner";

/**
 * Utilidades para manejar la integridad financiera y bloqueos de períodos
 */

export interface FinancialDataValidation {
  can_modify: boolean;
  is_locked: boolean;
  driver_is_paid?: boolean; // ⭐ NUEVO: Estado individual del conductor
  paid_drivers: number;
  total_drivers: number;
  warning_message: string;
}

/**
 * Maneja errores de integridad financiera y muestra mensajes apropiados
 */
export function handleFinancialIntegrityError(
  validation: FinancialDataValidation | null,
  operation: string = 'modificar'
): boolean {
  if (!validation) return true; // Si no hay validación, permitir operación

  if (validation.is_locked) {
    toast.error("Operación Bloqueada", {
      description: `No se puede ${operation} porque el período está bloqueado. ${validation.warning_message}`,
      duration: 5000
    });
    return false;
  }

  if (!validation.can_modify) {
    toast.warning("Precaución Requerida", {
      description: `Ten cuidado al ${operation}. ${validation.warning_message}`,
      duration: 4000
    });
    // Retornar true pero con advertencia
    return true;
  }

  return true;
}

/**
 * Verifica si una operación es permitida y muestra confirmación si es necesario
 */
export async function confirmFinancialOperation(
  validation: FinancialDataValidation | null,
  operation: string = 'modificar',
  requireConfirmation: boolean = false
): Promise<boolean> {
  if (!validation) return true;

  // Si está bloqueado, no permitir
  if (validation.is_locked) {
    handleFinancialIntegrityError(validation, operation);
    return false;
  }

  // Si hay conductores pagados y se requiere confirmación
  if (validation.paid_drivers > 0 && requireConfirmation) {
    return new Promise((resolve) => {
      const confirmed = window.confirm(
        `⚠️ PRECAUCIÓN FINANCIERA\n\n` +
        `${validation.warning_message}\n\n` +
        `Esta acción puede afectar cálculos de pago ya procesados.\n` +
        `¿Estás seguro de que deseas ${operation}?`
      );
      resolve(confirmed);
    });
  }

  return true;
}

/**
 * Determina el nivel de riesgo de una operación financiera
 */
export function getOperationRiskLevel(validation: FinancialDataValidation | null): 'safe' | 'caution' | 'blocked' {
  if (!validation) return 'safe';
  
  if (validation.is_locked) return 'blocked';
  if (validation.paid_drivers > 0) return 'caution';
  return 'safe';
}

/**
 * Obtiene clases CSS basadas en el estado de integridad financiera
 */
export function getFinancialIntegrityClasses(validation: FinancialDataValidation | null) {
  const riskLevel = getOperationRiskLevel(validation);
  
  return {
    container: {
      'safe': 'border-green-200 bg-green-50/30',
      'caution': 'border-yellow-200 bg-yellow-50/30',
      'blocked': 'border-red-200 bg-red-50/30'
    }[riskLevel],
    
    text: {
      'safe': 'text-green-700',
      'caution': 'text-yellow-700',
      'blocked': 'text-red-700'
    }[riskLevel],
    
    button: {
      'safe': 'bg-green-600 hover:bg-green-700',
      'caution': 'bg-yellow-600 hover:bg-yellow-700',
      'blocked': 'bg-gray-400 cursor-not-allowed'
    }[riskLevel]
  };
}

/**
 * Formatea un mensaje de estado financiero para mostrar al usuario
 */
export function formatFinancialStatusMessage(validation: FinancialDataValidation | null): string {
  if (!validation) return 'Estado financiero: Normal';
  
  if (validation.is_locked) {
    return `🔒 Período Bloqueado: ${validation.warning_message}`;
  }
  
  if (validation.paid_drivers > 0) {
    return `⚠️ Precaución: ${validation.paid_drivers} de ${validation.total_drivers} conductores ya pagados`;
  }
  
  return '✅ Período Activo: Se pueden realizar modificaciones';
}

/**
 * Hook helper para determinar si un botón debe estar deshabilitado
 */
export function shouldDisableFinancialOperation(
  validation: FinancialDataValidation | null,
  isLoading: boolean = false
): boolean {
  return isLoading || validation?.is_locked === true || validation?.driver_is_paid === true;
}

/**
 * Genera un mensaje de tooltip para botones relacionados con operaciones financieras
 */
export function getFinancialOperationTooltip(
  validation: FinancialDataValidation | null,
  operation: string = 'realizar esta operación'
): string | undefined {
  if (!validation) return undefined;
  
  if (validation.is_locked) {
    return `No se puede ${operation}: período bloqueado`;
  }
  
  if (validation.driver_is_paid) {
    return `No se puede ${operation}: conductor ya pagado`;
  }
  
  if (validation.paid_drivers > 0) {
    return `Precaución: ${validation.paid_drivers} conductor(es) ya pagado(s)`;
  }
  
  return undefined;
}