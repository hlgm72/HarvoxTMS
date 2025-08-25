import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
import { formatDateSafe, formatInternationalized, formatDateTimeAuto, formatDateTimeShort } from '@/lib/dateFormatting';
import { useNavigationMaps } from '@/hooks/useNavigationMaps';
import { LoadDocumentStatusIndicator } from '@/components/loads/LoadDocumentStatusIndicator';
import { LoadStatusHistoryButton } from '@/components/loads/LoadStatusHistoryButton';
import { SplitLoadActionButton } from "./SplitLoadActionButton";
import { cn } from "@/lib/utils";

interface LoadCardProps {
  load: {
    id: string;
    load_number: string;
    client_name: string;
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
  const { t } = useTranslation(['common', 'dashboard']);
  const { openInMaps } = useNavigationMaps();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
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
              {load.load_number} ({formatCurrency(load.total_amount)})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(load.status)}>
              {t(`common:loads.status.${load.status}`)}
            </Badge>
            <LoadDocumentStatusIndicator loadId={load.id} />
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground font-medium">
          {load.client_name}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Route Information */}
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{load.origin_city}, {load.origin_state}</p>
              <p className="text-muted-foreground">
                {formatDateSafe(load.pickup_date) && (
                  <>
                    {t('common:pickup')}: {formatDateTimeAuto(load.pickup_date)}
                  </>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-2 text-sm">
            <Navigation className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{load.destination_city}, {load.destination_state}</p>
              <p className="text-muted-foreground">
                {formatDateSafe(load.delivery_date) && (
                  <>
                    {t('common:delivery')}: {formatDateTimeAuto(load.delivery_date)}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Latest Status Update */}
        {(load.latest_status_notes || load.latest_status_eta) && (
          <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground">
              {t('dashboard:loads.latest_update')}
            </p>
            {load.latest_status_notes && (
              <p className="text-sm">{load.latest_status_notes}</p>
            )}
            {load.latest_status_eta && (
              <p className="text-xs text-muted-foreground">
                ETA: {formatDateTimeShort(load.latest_status_eta)}
              </p>
            )}
          </div>
        )}

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
          <SplitLoadActionButton
            load={load}
            onUpdateStatus={(loadId, newStatus, stopId, stopInfo) => {
              const actionText = getNextActionText(load.status);
              onUpdateStatus(loadId, newStatus, actionText, stopId, stopInfo);
            }}
            onUploadPOD={onUploadPOD}
            isPending={updateLoadStatus.isPending}
          />
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewDetails(load)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {t('common:view_details')}
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