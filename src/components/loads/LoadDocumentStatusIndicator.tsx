import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useLoadDocumentValidation } from '@/hooks/useLoadDocumentValidation';
import { useLoadWorkStatus } from '@/hooks/useLoadWorkStatus';

interface LoadDocumentStatusIndicatorProps {
  loadId: string;
  showDetails?: boolean;
}

export function LoadDocumentStatusIndicator({ 
  loadId, 
  showDetails = false 
}: LoadDocumentStatusIndicatorProps) {
  const { data: validation, isLoading: validationLoading } = useLoadDocumentValidation(loadId);
  const { data: workStatus, isLoading: workStatusLoading } = useLoadWorkStatus(loadId);

  if (validationLoading || workStatusLoading) {
    return (
      <Badge variant="secondary" className="text-xs">
        <Clock className="w-3 h-3 mr-1" />
        Verificando...
      </Badge>
    );
  }

  if (!validation || !workStatus) return null;

  // Determinar el estado general
  const getStatusInfo = () => {
    // Si ya está en progreso, mostrar documento activo
    if (workStatus.isInProgress && validation.activeWorkDocument) {
      const docLabel = validation.activeWorkDocument === 'load_order' ? 'LO' : 'RC';
      return {
        variant: 'default' as const,
        icon: CheckCircle,
        text: `Activo: ${docLabel}`,
        color: 'bg-green-100 text-green-800 border-green-200'
      };
    }

    // Si puede comenzar a trabajar
    if (validation.canStartWork) {
      const docLabel = validation.hasLoadOrder ? 'LO' : 'RC';
      return {
        variant: 'secondary' as const,
        icon: CheckCircle,
        text: `Listo: ${docLabel}`,
        color: 'bg-blue-100 text-blue-800 border-blue-200'
      };
    }

    // Falta documentación
    return {
      variant: 'destructive' as const,
      icon: AlertTriangle,
      text: 'Sin RC/LO',
      color: 'bg-red-100 text-red-800 border-red-200'
    };
  };

  const statusInfo = getStatusInfo();
  const IconComponent = statusInfo.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={statusInfo.variant}
        className={`text-xs px-2 py-1 ${statusInfo.color}`}
      >
        <IconComponent className="w-3 h-3 mr-1" />
        {statusInfo.text}
      </Badge>

      {showDetails && validation.activeWorkDocument && (
        <div className="text-xs text-muted-foreground">
          {validation.hasLoadOrder && validation.hasRateConfirmation && (
            <span className="text-orange-600">LO tiene prioridad</span>
          )}
          {workStatus.isInProgress && (
            <span className="text-amber-600">• Docs protegidos</span>
          )}
        </div>
      )}
    </div>
  );
}