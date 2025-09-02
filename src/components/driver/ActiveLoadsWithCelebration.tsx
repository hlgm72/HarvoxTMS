import { LoadCardWithCompletion } from './LoadCardWithCompletion';
import { useLoadCompletion } from '@/hooks/useLoadCompletion';

interface ActiveLoadsWithCelebrationProps {
  loads: any[];
  completedLoads: any[];
  onUpdateStatus: (loadId: string, newStatus: string, actionText: string, stopId?: string, stopInfo?: any) => void;
  onUploadPOD: (loadId: string, loadNumber?: string) => void;
  onViewDetails: (load: any) => void;
  onCallContact: (load: any) => void;
  onViewRoute: (load: any) => void;
  updateLoadStatus: { isPending: boolean };
  getNextActionText: (status: string) => string;
}

export function ActiveLoadsWithCelebration({
  loads,
  completedLoads,
  onUpdateStatus,
  onUploadPOD,
  onViewDetails,
  onCallContact,
  onViewRoute,
  updateLoadStatus,
  getNextActionText
}: ActiveLoadsWithCelebrationProps) {
  
  // ✅ COMPONENTE FUNCIONAL PARA CELEBRACIÓN
  function LoadWithCelebrationCheck({ load }: { load: any }) {
    const completionState = useLoadCompletion(load.id, load.status);
    
    console.log('🎉 LoadWithCelebrationCheck - Checking load:', {
      loadId: load.id,
      loadNumber: load.load_number,
      showCelebration: completionState.showCelebration
    });
    
    return (
      <LoadCardWithCompletion
        key={load.id}
        load={load}
        onUpdateStatus={onUpdateStatus}
        onUploadPOD={(loadId) => onUploadPOD(loadId, load.load_number)}
        onViewDetails={() => onViewDetails(load)}
        onCallContact={onCallContact}
        onViewRoute={onViewRoute}
        updateLoadStatus={updateLoadStatus}
        getNextActionText={getNextActionText}
      />
    );
  }
  
  // ✅ CREAR LISTA FINAL: loads activas + loads completadas en celebración
  const allDisplayLoads = [...loads];
  
  // Agregar solo las cargas completadas que están celebrando
  const celebratingCompletedLoads = completedLoads.filter(completedLoad => {
    // Este filtro se evalúa en render, no es ideal pero necesario
    return true; // Permitir que el componente hijo decida si muestra celebración
  });
  
  console.log('🎉 ActiveLoadsWithCelebration - Display loads:', {
    activeLoads: loads.length,
    completedLoads: completedLoads.length,
    totalDisplay: allDisplayLoads.length + celebratingCompletedLoads.length,
    displayLoadNumbers: [...allDisplayLoads, ...celebratingCompletedLoads].map(l => l.load_number)
  });

  return (
    <>
      {/* Renderizar cargas activas */}
      {allDisplayLoads.map((load) => (
        <LoadWithCelebrationCheck key={`active-${load.id}`} load={load} />
      ))}
      
      {/* Renderizar cargas completadas (para celebración) */}
      {celebratingCompletedLoads.map((load) => (
        <LoadWithCelebrationCheck key={`completed-${load.id}`} load={load} />
      ))}
    </>
  );
}