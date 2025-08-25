import { useState, useEffect } from 'react';
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
  const [completionState, setCompletionState] = useState<LoadCompletionState>({
    isCompleted: false,
    justCompleted: false,
    showCelebration: false
  });

  const isCompleted = status === 'delivered' && documentValidation?.hasPOD;

  useEffect(() => {
    const wasCompleted = completionState.isCompleted;
    const isNowCompleted = isCompleted;

    if (!wasCompleted && isNowCompleted) {
      // ¡Se acaba de completar!
      setCompletionState({
        isCompleted: true,
        justCompleted: true,  
        showCelebration: true
      });

      // Mostrar toast celebratorio
      showSuccess("🎉 ¡Carga Completada! POD subido exitosamente. Moviendo a historial...");

      // Después de 3 segundos, quitar la celebración
      setTimeout(() => {
        setCompletionState(prev => ({
          ...prev,
          showCelebration: false,
          justCompleted: false
        }));
      }, 3000);
    } else if (completionState.isCompleted !== isNowCompleted) {
      setCompletionState(prev => ({
        ...prev,
        isCompleted: isNowCompleted,
        justCompleted: false,
        showCelebration: false
      }));
    }
  }, [isCompleted, completionState.isCompleted]);

  return completionState;
};