import { AlertTriangle, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLoadDocumentValidation } from "@/hooks/useLoadDocumentValidation";

interface LoadDocumentValidationIndicatorProps {
  loadId: string;
  loadStatus: string;
  compact?: boolean;
}

export function LoadDocumentValidationIndicator({ 
  loadId, 
  loadStatus,
  compact = false 
}: LoadDocumentValidationIndicatorProps) {
  const { data: validation, isLoading } = useLoadDocumentValidation(loadId);

  if (isLoading) {
    return null;
  }

  if (!validation) {
    return null;
  }

  // Solo mostrar validación para cargas que están en progreso o pueden ser marcadas como entregadas
  const shouldShowValidation = ['assigned', 'in_transit', 'in_progress'].includes(loadStatus);
  
  if (!shouldShowValidation) {
    return null;
  }

  const hasWarnings = validation.missingRequiredDocuments.length > 0;
  const isDeliveryBlocked = !validation.canMarkAsDelivered && ['in_transit', 'in_progress'].includes(loadStatus);

  console.log('🔍 LoadDocumentValidationIndicator Debug:', {
    loadId,
    loadStatus,
    hasWarnings,
    isDeliveryBlocked,
    missingDocs: validation.missingRequiredDocuments,
    canMarkAsDelivered: validation.canMarkAsDelivered
  });

  if (!hasWarnings) {
    if (compact) {
      return (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" className="z-50">
              <p>Todos los documentos requeridos están presentes</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Documentos OK
      </Badge>
    );
  }

  // Mapeo de nombres de documentos a abreviaciones
  const documentAbbreviations: Record<string, string> = {
    'rate_confirmation': 'RC',
    'pod': 'POD',
    'bol': 'BOL',
    'driver_instructions': 'DI',
    'load_order': 'LO'
  };

  const abbreviatedMissingDocs = validation.missingRequiredDocuments
    .map(doc => documentAbbreviations[doc] || doc.toUpperCase())
    .join(', ');

  const warningMessage = isDeliveryBlocked 
    ? "No se puede marcar como entregada sin documentos requeridos"
    : `Faltan documentos requeridos: ${abbreviatedMissingDocs}`;

  if (compact) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
               <span className="inline-flex">
                 {isDeliveryBlocked ? (
                   <XCircle className="h-4 w-4 text-red-600" />
                 ) : (
                   <AlertCircle className="h-4 w-4 text-orange-600" />
                 )}
               </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center" className="z-50 max-w-xs">
            <p>{warningMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={
        isDeliveryBlocked 
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-orange-50 text-orange-700 border-orange-200"
      }
    >
       {isDeliveryBlocked ? (
         <XCircle className="h-3 w-3 mr-1" />
       ) : (
         <AlertCircle className="h-3 w-3 mr-1" />
       )}
      {isDeliveryBlocked ? "Entrega bloqueada" : "Docs. pendientes"}
    </Badge>
  );
}