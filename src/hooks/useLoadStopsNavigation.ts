import { useMemo } from 'react';

export interface LoadStop {
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
}

export interface LoadWithStops {
  id: string;
  status: string;
  stops?: LoadStop[];
}

interface NextStopInfo {
  stop: LoadStop;
  actionText: string;
  nextStatus: string;
  requiresPOD?: boolean; // Nueva propiedad para indicar si necesita POD
  isLastDelivery?: boolean; // Nueva propiedad para indicar si es la última entrega
}

export function useLoadStopsNavigation(load: LoadWithStops) {
  const nextStopInfo = useMemo((): NextStopInfo | null => {
    if (!load.stops || load.stops.length === 0) {
      return null;
    }

    // Ordenar paradas por número
    const sortedStops = [...load.stops].sort((a, b) => a.stop_number - b.stop_number);
    
    // Determinar la próxima parada basada en el estado actual
    let nextStop: LoadStop | null = null;
    let actionText = '';
    let nextStatus = '';

    switch (load.status) {
      case 'assigned':
        // Ir a la primera parada (primer pickup)
        nextStop = sortedStops.find(stop => stop.stop_type === 'pickup') || sortedStops[0];
        actionText = 'Camino a recoger';
        nextStatus = 'en_route_pickup';
        break;

      case 'en_route_pickup':
        // Llegar a la parada de recogida actual
        nextStop = sortedStops.find(stop => stop.stop_type === 'pickup') || sortedStops[0];
        actionText = 'Llegué a recogida';
        nextStatus = 'at_pickup';
        break;

      case 'at_pickup':
        // Cargar mercancía y continuar
        nextStop = sortedStops.find(stop => stop.stop_type === 'pickup') || sortedStops[0];
        actionText = 'Recogida completada';
        nextStatus = 'loaded';
        break;

      case 'loaded':
        // Ir a la próxima parada (siguiente pickup o primera delivery)
        const currentPickupIndex = sortedStops.findIndex(stop => stop.stop_type === 'pickup');
        const nextPickup = sortedStops.slice(currentPickupIndex + 1).find(stop => stop.stop_type === 'pickup');
        
        if (nextPickup) {
          nextStop = nextPickup;
          actionText = 'Camino a recoger';
          nextStatus = 'en_route_pickup';
        } else {
          // No hay más pickups, ir a primera entrega
          nextStop = sortedStops.find(stop => stop.stop_type === 'delivery');
          if (nextStop) {
            actionText = 'Camino a entregar';
            nextStatus = 'en_route_delivery';
          }
        }
        break;

      case 'en_route_delivery':
        // Llegar a la parada de entrega actual
        nextStop = sortedStops.find(stop => stop.stop_type === 'delivery');
        if (nextStop) {
          actionText = 'Llegué a entrega';
          nextStatus = 'at_delivery';
        }
        break;

      case 'at_delivery':
        // Entregar mercancía
        const currentDeliveryStop = sortedStops.find(stop => stop.stop_type === 'delivery');
        if (currentDeliveryStop) {
          // Verificar si hay más entregas pendientes
          const currentDeliveryIndex = sortedStops.findIndex(stop => 
            stop.stop_type === 'delivery' && stop.stop_number === currentDeliveryStop.stop_number
          );
          const nextDelivery = sortedStops.slice(currentDeliveryIndex + 1).find(stop => stop.stop_type === 'delivery');
          
          if (nextDelivery) {
            nextStop = nextDelivery;
            actionText = 'Camino a entregar';
            nextStatus = 'en_route_delivery';
          } else {
            // Última entrega - verificar POD
            nextStop = currentDeliveryStop;
            actionText = 'Entrega completada';
            nextStatus = 'delivered';
          }
        }
        break;

      default:
        return null;
    }

    if (!nextStop) {
      return null;
    }

    // Determinar si es la última entrega
    const isLastDelivery = load.status === 'at_delivery' && 
      nextStatus === 'delivered' && 
      nextStop.stop_type === 'delivery';

    return {
      stop: nextStop,
      actionText,
      nextStatus,
      requiresPOD: isLastDelivery,
      isLastDelivery
    };
  }, [load.status, load.stops]);

  return {
    nextStopInfo,
    hasNextAction: !!nextStopInfo
  };
}