import { Button } from "@/components/ui/button";
import { CheckCircle, Upload } from "lucide-react";
import { useLoadStopsNavigation } from '@/hooks/useLoadStopsNavigation';
import { useLoadDocumentValidation } from '@/hooks/useLoadDocumentValidation';

interface LoadActionButtonWithPODProps {
  load: {
    id: string;
    status: string;
    stops?: Array<{
      id?: string;
      load_id?: string;
      stop_number: number;
      stop_type: 'pickup' | 'delivery';
      company_name?: string;
      address?: string;
      city: string;
      state: string;
      zip_code?: string;
      contact_name?: string;
      contact_phone?: string;
      reference_number?: string;
      scheduled_date?: string;
      scheduled_time?: string;
      special_instructions?: string;
    }>;
  };
  onUpdateStatus: (loadId: string, newStatus: string, stopId?: string, stopInfo?: any) => void;
  onUploadPOD: (loadId: string) => void;
  isPending: boolean;
}

export function LoadActionButtonWithPOD({ 
  load, 
  onUpdateStatus, 
  onUploadPOD, 
  isPending 
}: LoadActionButtonWithPODProps) {
  const { nextStopInfo, hasNextAction } = useLoadStopsNavigation(load);
  const { data: documentValidation } = useLoadDocumentValidation(load.id);

  // Fallback para la lógica anterior si no hay paradas definidas
  const getNextStatusFallback = (currentStatus: string): string | null => {
    const statusFlow = {
      'assigned': 'en_route_pickup',
      'en_route_pickup': 'at_pickup',
      'at_pickup': 'loaded',
      'loaded': 'en_route_delivery',
      'en_route_delivery': 'at_delivery',
      'at_delivery': 'delivered'
    };
    return statusFlow[currentStatus as keyof typeof statusFlow] || null;
  };

  const getFallbackText = (status: string): string => {
    switch (status) {
      case 'en_route_pickup': return 'Camino a recoger';
      case 'at_pickup': return 'Llegué a recogida';
      case 'loaded': return 'Recogida completada';
      case 'en_route_delivery': return 'Camino a entregar';
      case 'at_delivery': return 'Llegué a entrega';
      case 'delivered': return 'Entrega completada';
      default: return 'Continuar';
    }
  };

  // Usar la nueva lógica si hay paradas
  if (hasNextAction && nextStopInfo) {
    // Si es la última entrega y el status es 'delivered' y no hay POD, mostrar botón de subir POD
    if (nextStopInfo.isLastDelivery && nextStopInfo.nextStatus === 'delivered' && !documentValidation?.hasPOD) {
      return (
        <Button 
          size="sm" 
          className="flex-1"
          onClick={() => onUploadPOD(load.id)}
          disabled={isPending}
          variant="default"
        >
          <Upload className="h-4 w-4 mr-2" />
          Subir POD
        </Button>
      );
    }

    // Botón normal para todos los otros casos
    return (
      <Button 
        size="sm" 
        className="flex-1"
        onClick={() => onUpdateStatus(
          load.id, 
          nextStopInfo.nextStatus, 
          nextStopInfo.stop.id, 
          nextStopInfo.stop
        )}
        disabled={isPending}
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        {nextStopInfo.actionText}
      </Button>
    );
  }

  // Fallback a la lógica anterior
  const nextStatus = getNextStatusFallback(load.status);
  if (!nextStatus) {
    return null;
  }

  // Si es la última entrega en el fallback y el próximo estado es 'delivered' y no hay POD
  if (load.status === 'at_delivery' && nextStatus === 'delivered' && !documentValidation?.hasPOD) {
    return (
      <Button 
        size="sm" 
        className="flex-1"
        onClick={() => onUploadPOD(load.id)}
        disabled={isPending}
        variant="default"
      >
        <Upload className="h-4 w-4 mr-2" />
        Subir POD
      </Button>
    );
  }

  return (
    <Button 
      size="sm" 
      className="flex-1"
      onClick={() => onUpdateStatus(load.id, nextStatus)}
      disabled={isPending}
    >
      <CheckCircle className="h-4 w-4 mr-2" />
      {getFallbackText(nextStatus)}
    </Button>
  );
}