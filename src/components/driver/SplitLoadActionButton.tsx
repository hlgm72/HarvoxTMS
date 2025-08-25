import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircle, ChevronDown, Upload } from "lucide-react";
import { useLoadStopsNavigation, LoadWithStops } from '@/hooks/useLoadStopsNavigation';
import { useLoadDocumentValidation } from '@/hooks/useLoadDocumentValidation';
import { useTranslation } from 'react-i18next';

interface SplitLoadActionButtonProps {
  load: LoadWithStops;
  onUpdateStatus: (loadId: string, newStatus: string, stopId?: string, stopInfo?: any) => void;
  onUploadPOD: (loadId: string) => void;
  isPending: boolean;
}

export function SplitLoadActionButton({ 
  load, 
  onUpdateStatus, 
  onUploadPOD, 
  isPending 
}: SplitLoadActionButtonProps) {
  console.log('🚀 SplitLoadActionButton - INICIO', { loadId: load.id, status: load.status, isPending });
  
  const { t } = useTranslation(['common']);
  const { nextStopInfo, hasNextAction } = useLoadStopsNavigation(load);
  const { data: documentValidation } = useLoadDocumentValidation(load.id);
  const [dropdownOpen, setDropdownOpen] = useState(false);

    // Estados base del sistema
    const getAllStates = () => {
      const baseStates = [
        { key: 'created', label: t('common:loads.status.created') },
        { key: 'route_planned', label: t('common:loads.status.route_planned') },
        { key: 'assigned', label: t('common:loads.status.assigned') },
        { key: 'en_route_pickup', label: t('common:loads.status.en_route_pickup') },
        { key: 'at_pickup', label: t('common:loads.status.at_pickup') },
        { key: 'loaded', label: t('common:loads.status.loaded') },
        { key: 'en_route_delivery', label: t('common:loads.status.en_route_delivery') },
        { key: 'at_delivery', label: t('common:loads.status.at_delivery') },
        { key: 'delivered', label: t('common:loads.status.delivered') }
      ];

    // Si hay stops, usar lógica más sofisticada
    if (load.stops && load.stops.length > 0) {
      const pickupStops = load.stops.filter(s => s.stop_type === 'pickup');
      const deliveryStops = load.stops.filter(s => s.stop_type === 'delivery');
      
      // Para múltiples paradas, agregar estados específicos
      const states = [...baseStates];
      
      // Si hay múltiples pickups o deliveries, podrías agregar estados específicos
      // Por ahora mantenemos los estados base
      
      return states;
    }

    return baseStates;
  };

  // Determinar qué estados están disponibles basado en el estado actual
  const getAvailableStates = () => {
    const allStates = getAllStates();
    const cleanStatus = load.status.trim(); // Limpiar espacios y saltos de línea
    const currentStatusIndex = allStates.findIndex(s => s.key === cleanStatus);
    
    console.log('🔍 SplitLoadActionButton Debug:', {
      originalStatus: load.status,
      cleanStatus: cleanStatus,
      allStates: allStates.map(s => s.key),
      currentStatusIndex,
      availableStates: currentStatusIndex === -1 ? [] : allStates.slice(currentStatusIndex + 1)
    });
    
    if (currentStatusIndex === -1) return [];
    
    // Mostrar solo estados futuros (no permitir retroceder)
    return allStates.slice(currentStatusIndex + 1);
  };

  // Lógica para la acción principal (mismo comportamiento actual)
  const getPrimaryAction = () => {
    const cleanStatus = load.status.trim(); // Limpiar espacios y saltos de línea
    
    // Si está delivered y no tiene POD, mostrar Upload POD
    if (cleanStatus === 'delivered' && !documentValidation?.hasPOD) {
      return {
        text: t('common:loads.actions.upload_pod'),
        icon: Upload,
        action: () => onUploadPOD(load.id)
      };
    }

    // Si hay navegación de stops, usarla
    if (hasNextAction && nextStopInfo) {
      return {
        text: nextStopInfo.actionText,
        icon: CheckCircle,
        action: () => onUpdateStatus(load.id, nextStopInfo.nextStatus, nextStopInfo.stop?.id, nextStopInfo)
      };
    }

    // Fallback para flujo básico
    const availableStates = getAvailableStates();
    if (availableStates.length > 0) {
      const nextState = availableStates[0];
      return {
        text: nextState.label,
        icon: CheckCircle,
        action: () => onUpdateStatus(load.id, nextState.key)
      };
    }

    return null;
  };

  const primaryAction = getPrimaryAction();
  const availableStates = getAvailableStates();

  console.log('🎯 SplitLoadActionButton - RENDER CHECK', {
    loadId: load.id,
    primaryAction: primaryAction ? primaryAction.text : 'null',
    availableStatesLength: availableStates.length,
    willRender: !!primaryAction
  });

  if (!primaryAction) {
    console.log('❌ SplitLoadActionButton - NO PRIMARY ACTION, returning null');
    return null; // No hay acciones disponibles
  }

  return (
    <div className="flex w-full">
      {/* Botón principal */}
      <Button
        onClick={primaryAction.action}
        disabled={isPending}
        size="sm"
        className={`flex-1 min-w-0 ${availableStates.length > 1 ? 'rounded-r-none border-r-0' : ''}`}
      >
        <primaryAction.icon className="h-4 w-4 mr-2 shrink-0" />
        <span className="truncate">{primaryAction.text}</span>
      </Button>

      {/* Dropdown para saltar estados (solo si hay estados disponibles) */}
      {availableStates.length > 1 && (
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              size="sm"
              disabled={isPending}
              className="px-2 rounded-l-none border-l border-primary/20 shrink-0"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-56 bg-background border shadow-lg z-50"
          >
            {availableStates.slice(1).map((state) => (
              <DropdownMenuItem
                key={state.key}
                onClick={() => {
                  onUpdateStatus(load.id, state.key);
                  setDropdownOpen(false);
                }}
                className="cursor-pointer hover:bg-muted"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('common:loads.skip_to')}: {state.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}