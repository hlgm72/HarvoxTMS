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
  // ✅ ARREGLO: Usar useRef para evitar loops infinitos
  const previousStatusRef = useRef({ isCompleted: false, hasTriggered: false });
  
  const [completionState, setCompletionState] = useState<LoadCompletionState>({
    isCompleted: false,
    justCompleted: false,
    showCelebration: false
  });

  // ✅ VALIDACIÓN ESTRICTA: Solo cargas delivered con POD pueden estar completadas
  const isCompleted = status === 'delivered' && documentValidation?.hasPOD === true;

  console.log('🎉 useLoadCompletion - State:', { 
    loadId, 
    status, 
    hasPOD: documentValidation?.hasPOD, 
    isCompleted, 
    completionState 
  });

  useEffect(() => {
    const wasCompleted = previousStatusRef.current.isCompleted;
    const isNowCompleted = isCompleted;
    const hasAlreadyTriggered = previousStatusRef.current.hasTriggered;

    console.log('🎉 useLoadCompletion - Effect:', { 
      loadId, 
      wasCompleted, 
      isNowCompleted, 
      hasAlreadyTriggered,
      showCelebration: completionState.showCelebration 
    });

    // Si cambió a completado y no hemos disparado celebración para esta carga
    if (!wasCompleted && isNowCompleted && !hasAlreadyTriggered && !completionState.showCelebration) {
      // ¡Se acaba de completar!
      console.log('🎉 useLoadCompletion - TRIGGERING CELEBRATION!', { loadId });
      
      setCompletionState({
        isCompleted: true,
        justCompleted: true,  
        showCelebration: true
      });

      // Marcar que ya triggereamos la celebración para esta carga
      previousStatusRef.current = { isCompleted: true, hasTriggered: true };

      // Mostrar toast celebratorio
      showSuccess("🎉 ¡Carga Completada! POD subido exitosamente. Moviendo a historial...");

      // Limpiar timeout previo si existe
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }

      // Después de 5 segundos, quitar la celebración
      celebrationTimeoutRef.current = setTimeout(() => {
        console.log('🎉 useLoadCompletion - ENDING CELEBRATION', { loadId });
        setCompletionState(prev => ({
          ...prev,
          showCelebration: false,
          justCompleted: false
        }));
      }, 5000);
    } 
    // Si el estado cambió pero no está en celebración, actualizar silenciosamente
    else if (wasCompleted !== isNowCompleted && !completionState.showCelebration) {
      console.log('🎉 useLoadCompletion - UPDATING STATE SILENTLY', { loadId, wasCompleted, isNowCompleted });
      setCompletionState(prev => ({
        ...prev,
        isCompleted: isNowCompleted,
        justCompleted: false,
        showCelebration: false
      }));
    }
    
    // Actualizar referencia solo cuando sea necesario
    if (wasCompleted !== isNowCompleted || !hasAlreadyTriggered) {
      previousStatusRef.current = { 
        isCompleted: isNowCompleted, 
        hasTriggered: hasAlreadyTriggered || (!wasCompleted && isNowCompleted)
      };
    }
  }, [isCompleted, loadId, showSuccess]); // ✅ ARREGLADO: Removidas las dependencias problemáticas

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      console.log('🎉 useLoadCompletion - CLEANUP', { loadId });
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }
    };
  }, []);

  return completionState;
};