import { useState, useEffect, useRef } from 'react';
import { useLoadDocumentValidation } from './useLoadDocumentValidation';
import { useFleetNotifications } from '@/components/notifications';

interface LoadCompletionState {
  isCompleted: boolean;
  justCompleted: boolean;
  showCelebration: boolean;
}

export const useLoadCompletion = (loadId: string, status: string) => {
  const { data: documentValidation } = useLoadDocumentValidation(loadId);
  const { showSuccess } = useFleetNotifications();
  const celebrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [completionState, setCompletionState] = useState<LoadCompletionState>({
    isCompleted: false,
    justCompleted: false,
    showCelebration: false
  });

  const isCompleted = status === 'delivered' && documentValidation?.hasPOD;

  useEffect(() => {
    const wasCompleted = completionState.isCompleted;
    const isNowCompleted = isCompleted;

    if (!wasCompleted && isNowCompleted && !completionState.showCelebration) {
      // ¡Se acaba de completar!
      setCompletionState({
        isCompleted: true,
        justCompleted: true,  
        showCelebration: true
      });

      // Mostrar toast celebratorio
      showSuccess("🎉 ¡Carga Completada! POD subido exitosamente. Moviendo a historial...");

      // Limpiar timeout previo si existe
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }

      // Después de 5 segundos, quitar la celebración
      celebrationTimeoutRef.current = setTimeout(() => {
        setCompletionState(prev => ({
          ...prev,
          showCelebration: false,
          justCompleted: false
        }));
      }, 5000);
    } else if (completionState.isCompleted !== isNowCompleted && !completionState.showCelebration) {
      // Solo actualizar si no está en celebración
      setCompletionState(prev => ({
        ...prev,
        isCompleted: isNowCompleted,
        justCompleted: false,
        showCelebration: false
      }));
    }
  }, [isCompleted, completionState.isCompleted, completionState.showCelebration]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }
    };
  }, []);

  return completionState;
};