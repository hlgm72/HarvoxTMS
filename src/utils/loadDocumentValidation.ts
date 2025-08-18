/**
 * Utilidades para validación y gestión de documentos de carga
 * Implementa las reglas de negocio para RC y LO
 */

export interface DocumentValidationRules {
  canDelete: boolean;
  canReplace: boolean;
  reason?: string;
}

/**
 * Valida si un documento puede ser eliminado o reemplazado
 */
export function validateDocumentAction(
  documentType: string,
  loadStatus: string,
  actionType: 'delete' | 'replace'
): DocumentValidationRules {
  const workInProgressStatuses = [
    'en_route_pickup',
    'at_pickup', 
    'loaded',
    'en_route_delivery',
    'at_delivery',
    'delivered'
  ];

  const isWorkInProgress = workInProgressStatuses.includes(loadStatus);

  // Rate Confirmation rules
  if (documentType === 'rate_confirmation') {
    if (actionType === 'delete' && isWorkInProgress) {
      return {
        canDelete: false,
        canReplace: true,
        reason: 'No se puede eliminar el Rate Confirmation mientras la carga está en progreso. Puede reemplazarlo.'
      };
    }
    return { canDelete: true, canReplace: true };
  }

  // Load Order rules
  if (documentType === 'load_order') {
    if (actionType === 'delete' && isWorkInProgress) {
      return {
        canDelete: false,
        canReplace: true,
        reason: 'No se puede eliminar el Load Order mientras la carga está en progreso. Puede regenerarlo.'
      };
    }
    return { canDelete: true, canReplace: true };
  }

  // Other document types
  return { canDelete: true, canReplace: true };
}

/**
 * Determina qué documento tiene prioridad para el trabajo
 */
export function getActiveWorkDocument(
  hasLoadOrder: boolean,
  hasRateConfirmation: boolean
): 'load_order' | 'rate_confirmation' | null {
  if (hasLoadOrder) return 'load_order';
  if (hasRateConfirmation) return 'rate_confirmation';
  return null;
}

/**
 * Valida si una carga puede comenzar a trabajarse
 */
export function canStartLoad(
  hasLoadOrder: boolean,
  hasRateConfirmation: boolean
): boolean {
  return hasLoadOrder || hasRateConfirmation;
}

/**
 * Obtiene el mensaje de estado de documentos para UI
 */
export function getDocumentStatusMessage(
  hasLoadOrder: boolean,
  hasRateConfirmation: boolean,
  isWorkInProgress: boolean
): { message: string; type: 'success' | 'warning' | 'error' } {
  if (!hasLoadOrder && !hasRateConfirmation) {
    return {
      message: 'Se requiere subir un Rate Confirmation o generar un Load Order para que el conductor pueda comenzar',
      type: 'error'
    };
  }

  if (hasLoadOrder && hasRateConfirmation) {
    return {
      message: `Load Order activo (tiene prioridad sobre RC)${isWorkInProgress ? ' • Documentos protegidos' : ''}`,
      type: 'success'
    };
  }

  if (hasLoadOrder) {
    return {
      message: `Load Order activo${isWorkInProgress ? ' • Documento protegido' : ''}`,
      type: 'success'
    };
  }

  return {
    message: `Rate Confirmation activo${isWorkInProgress ? ' • Documento protegido' : ''}`,
    type: 'success'
  };
}
