import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useLoadDocumentValidation } from '@/hooks/useLoadDocumentValidation';
import { useLoadWorkStatus } from '@/hooks/useLoadWorkStatus';
import { useTranslation } from 'react-i18next';

interface LoadDocumentStatusIndicatorProps {
  loadId: string;
  showDetails?: boolean;
}

export function LoadDocumentStatusIndicator({ 
  loadId, 
  showDetails = false 
}: LoadDocumentStatusIndicatorProps) {
  const { t } = useTranslation('loads');
  const { data: validation, isLoading: validationLoading } = useLoadDocumentValidation(loadId);
  const { data: workStatus, isLoading: workStatusLoading } = useLoadWorkStatus(loadId);

  if (validationLoading || workStatusLoading) {
    return (
      <Badge variant="secondary" className="text-xs">
        <Clock className="w-3 h-3 mr-1" />
        {t('validation.verifying')}
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
        text: t('validation.active', { doc: docLabel }),
        color: 'bg-green-100 text-green-800 border-green-200'
      };
    }

    // Si puede comenzar a trabajar
    if (validation.canStartWork) {
      const docLabel = validation.hasLoadOrder ? 'LO' : 'RC';
      return {
        variant: 'secondary' as const,
        icon: CheckCircle,
        text: t('validation.ready', { doc: docLabel }),
        color: 'bg-blue-100 text-blue-800 border-blue-200'
      };
    }

    // Falta documentación
    return {
      variant: 'destructive' as const,
      icon: AlertTriangle,
      text: t('validation.missing'),
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

    </div>
  );
}