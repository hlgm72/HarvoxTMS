import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useLoadStopsNavigation } from '@/hooks/useLoadStopsNavigation';

interface LoadActionButtonProps {
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
  onUpdateStatus: (loadId: string, newStatus: string) => void;
  isPending: boolean;
}

export function LoadActionButton({ load, onUpdateStatus, isPending }: LoadActionButtonProps) {
  const { nextStopInfo, hasNextAction } = useLoadStopsNavigation(load);

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
      case 'en_route_pickup': return 'Ir al origen';
      case 'at_pickup': return 'En origen';
      case 'loaded': return 'Cargado';
      case 'en_route_delivery': return 'Ir al destino';
      case 'at_delivery': return 'En destino';
      case 'delivered': return 'Entregado';
      default: return 'Continuar';
    }
  };

  // Usar la nueva lógica si hay paradas, sino usar la lógica anterior
  if (hasNextAction && nextStopInfo) {
    return (
      <Button 
        size="sm" 
        className="flex-1"
        onClick={() => onUpdateStatus(load.id, nextStopInfo.nextStatus)}
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