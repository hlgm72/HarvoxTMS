import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  MapPin, 
  Phone, 
  FileText, 
  Navigation, 
  Eye,
  CheckCircle,
  Package
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDateSafe, formatDateAuto, formatCurrency } from '@/lib/dateFormatting';
import { useNavigationMaps } from '@/hooks/useNavigationMaps';
import { LoadStatusHistoryButton } from '@/components/loads/LoadStatusHistoryButton';
import { SplitLoadActionButton } from "./SplitLoadActionButton";
import { cn } from "@/lib/utils";

interface LoadCardProps {
  load: {
    id: string;
    load_number: string;
    client_name: string;
    client_contact_name?: string;
    client_contact_id?: string;
    origin_city: string;
    origin_state: string;
    destination_city: string;
    destination_state: string;
    pickup_date: string;
    delivery_date: string;
    status: string;
    total_amount: number;
    progress: number;
    latest_status_notes?: string;
    latest_status_eta?: string;
    stops?: any[];
  };
  onUpdateStatus: (loadId: string, newStatus: string, actionText: string, stopId?: string, stopInfo?: any) => void;
  onUploadPOD: (loadId: string) => void;
  onViewDetails: (load: any) => void;
  onCallContact: (load: any) => void;
  onViewRoute: (load: any) => void;
  updateLoadStatus: { isPending: boolean };
  getNextActionText: (status: string) => string;
}

export function LoadCard({ 
  load, 
  onUpdateStatus, 
  onUploadPOD, 
  onViewDetails, 
  onCallContact, 
  onViewRoute, 
  updateLoadStatus, 
  getNextActionText 
}: LoadCardProps) {
  const { t, i18n } = useTranslation(['loads', 'common', 'dashboard']);
  const { openInMaps } = useNavigationMaps();

  console.log('🔍 LoadCard - Translation test:', {
    status: load.status,
    statusTrimmed: load.status.trim(),
    translationKey: `status.${load.status.trim()}`,
    result: t(`status.${load.status.trim()}`),
    namespace: 'loads',
    language: i18n.language,
    loadStatus: load.status
  });

  const formatCurrencyAmount = (amount: number) => {
    return formatCurrency(amount, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0,
      style: 'currency'
    });
  };

  const getStatusVariant = (status: string) => {
    const cleanStatus = status.trim(); // Limpiar espacios y saltos de línea
    switch (cleanStatus) {
      case 'assigned': return 'outline';
      case 'en_route_pickup': return 'secondary';
      case 'at_pickup': return 'secondary';
      case 'loaded': return 'default';
      case 'en_route_delivery': return 'default';
      case 'at_delivery': return 'default';
      case 'delivered': return 'default';
      case 'closed': return 'default';
      default: return 'outline';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            {/* Icono visible solo en pantallas pequeñas */}
            <Package className="h-5 w-5 md:hidden" />
            <span>
              {/* "Load #" visible solo en pantallas grandes */}
              <span className="hidden md:inline">Load #</span>
              {load.load_number} ({formatCurrencyAmount(load.total_amount)})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(load.status.trim())}>
              {t('common:status.' + load.status.trim())}
            </Badge>
          </div>
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium">{load.client_name}</p>
          {load.client_contact_name && (
            <p className="text-xs">Contact: {load.client_contact_name}</p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Route Information */}
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              {load.stops && load.stops.length > 0 ? (
                // Show address from first pickup stop
                (() => {
                  const pickupStop = load.stops.find(stop => stop.stop_type === 'pickup');
                  return (
                     <div 
                       className="cursor-pointer hover:text-primary transition-colors group"
                       onClick={() => pickupStop && openInMaps({
                         address: pickupStop.address,
                         city: pickupStop.city,
                         state: pickupStop.state,
                         zipCode: pickupStop.zip_code
                       })}
                     >
                        <p className="font-medium group-hover:underline decoration-2 underline-offset-2">
                          {pickupStop?.company_name || `${load.origin_city}, ${load.origin_state}`}
                          {(() => {
                            // Priorizar fecha/hora del stop si está disponible
                            if (pickupStop?.scheduled_date) {
                              const dateStr = formatDateSafe(pickupStop.scheduled_date);
                              const timeStr = pickupStop.scheduled_time ? 
                                (pickupStop.scheduled_time.length > 5 ? pickupStop.scheduled_time.substring(0, 5) : pickupStop.scheduled_time) : 
                                null;
                              return (
                                <span className="font-normal text-muted-foreground ml-1">
                                  ({dateStr}{timeStr ? ` ${timeStr}` : ''})
                                </span>
                              );
                            }
                            // Fallback a pickup_date si no hay stop
                            if (load.pickup_date) {
                              return (
                                <span className="font-normal text-muted-foreground ml-1">
                                  ({formatDateSafe(load.pickup_date)})
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </p>
                       {pickupStop?.address && (
                         <p className="text-xs text-muted-foreground">{pickupStop.address}</p>
                       )}
                       <p className="text-xs text-muted-foreground group-hover:underline decoration-1 underline-offset-1">
                         {pickupStop?.city}, {pickupStop?.state} {pickupStop?.zip_code}
                       </p>
                     </div>
                  );
                })()
              ) : (
                 <div 
                   className="cursor-pointer hover:text-primary transition-colors group"
                   onClick={() => openInMaps({
                     city: load.origin_city,
                     state: load.origin_state
                   })}
                 >
                    <p className="font-medium group-hover:underline decoration-2 underline-offset-2">
                      {load.origin_city}, {load.origin_state}
                      {load.pickup_date && (
                        <span className="font-normal text-muted-foreground ml-1">
                          ({formatDateSafe(load.pickup_date)})
                        </span>
                      )}
                    </p>
                 </div>
               )}
             </div>
           </div>
          
          <div className="flex items-start gap-2 text-sm">
            <Navigation className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              {load.stops && load.stops.length > 0 ? (
                // Show address from last delivery stop
                (() => {
                  const deliveryStops = load.stops.filter(stop => stop.stop_type === 'delivery');
                  const lastDeliveryStop = deliveryStops[deliveryStops.length - 1];
                  return (
                     <div 
                       className="cursor-pointer hover:text-primary transition-colors group"
                       onClick={() => lastDeliveryStop && openInMaps({
                         address: lastDeliveryStop.address,
                         city: lastDeliveryStop.city,
                         state: lastDeliveryStop.state,
                         zipCode: lastDeliveryStop.zip_code
                       })}
                     >
                        <p className="font-medium group-hover:underline decoration-2 underline-offset-2">
                          {lastDeliveryStop?.company_name || `${load.destination_city}, ${load.destination_state}`}
                          {(() => {
                            // Priorizar fecha/hora del stop si está disponible
                            if (lastDeliveryStop?.scheduled_date) {
                              const dateStr = formatDateSafe(lastDeliveryStop.scheduled_date);
                              const timeStr = lastDeliveryStop.scheduled_time ? 
                                (lastDeliveryStop.scheduled_time.length > 5 ? lastDeliveryStop.scheduled_time.substring(0, 5) : lastDeliveryStop.scheduled_time) : 
                                null;
                              return (
                                <span className="font-normal text-muted-foreground ml-1">
                                  ({dateStr}{timeStr ? ` ${timeStr}` : ''})
                                </span>
                              );
                            }
                            // Fallback a delivery_date si no hay stop
                            if (load.delivery_date) {
                              return (
                                <span className="font-normal text-muted-foreground ml-1">
                                  ({formatDateSafe(load.delivery_date)})
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </p>
                       {lastDeliveryStop?.address && (
                         <p className="text-xs text-muted-foreground">{lastDeliveryStop.address}</p>
                       )}
                       <p className="text-xs text-muted-foreground group-hover:underline decoration-1 underline-offset-1">
                         {lastDeliveryStop?.city}, {lastDeliveryStop?.state} {lastDeliveryStop?.zip_code}
                       </p>
                     </div>
                  );
                })()
              ) : (
                 <div 
                   className="cursor-pointer hover:text-primary transition-colors group"
                   onClick={() => openInMaps({
                     city: load.destination_city,
                     state: load.destination_state
                   })}
                 >
                    <p className="font-medium group-hover:underline decoration-2 underline-offset-2">
                      {load.destination_city}, {load.destination_state}
                      {load.delivery_date && (
                        <span className="font-normal text-muted-foreground ml-1">
                          ({formatDateSafe(load.delivery_date)})
                        </span>
                      )}
                    </p>
                 </div>
               )}
             </div>
           </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t('dashboard:loads.progress')}</span>
            <span className="font-medium">{Math.round(load.progress)}%</span>
          </div>
          <Progress value={load.progress} className="h-2" />
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <div className="flex-1">
            <SplitLoadActionButton
              load={load}
              onUpdateStatus={(loadId, newStatus, stopId, stopInfo) => {
                console.log('🔥 LoadCard - SplitLoadActionButton clicked:', { loadId, newStatus, stopId, stopInfo });
                const actionText = getNextActionText(load.status);
                onUpdateStatus(loadId, newStatus, actionText, stopId, stopInfo);
              }}
              onUploadPOD={onUploadPOD}
              isPending={updateLoadStatus.isPending}
            />
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            className="shrink-0"
            onClick={() => onViewDetails(load)}
          >
            <Eye className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('common:view_details')}</span>
            <span className="sm:hidden">Details</span>
          </Button>
        </div>

        {/* Secondary Actions */}
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1"
            onClick={() => onCallContact(load)}
          >
            <Phone className="h-4 w-4 mr-2" />
            {t('common:contact')}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1"
            onClick={() => onViewRoute(load)}
          >
            <Navigation className="h-4 w-4 mr-2" />
            {t('common:route')}
          </Button>
          
          <LoadStatusHistoryButton 
            loadId={load.id} 
            loadNumber={load.load_number} 
          />
        </div>

        {/* Amount - removido de aquí ya que se muestra en el título */}
      </CardContent>
    </Card>
  );
}