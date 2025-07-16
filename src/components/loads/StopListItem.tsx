import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Calendar, Clock, Building, AlertTriangle, Grip, Edit } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LoadStop } from '@/hooks/useLoadStops';

interface StopListItemProps {
  stop: LoadStop;
  onEdit: () => void;
  isFirst: boolean;
  isLast: boolean;
  dragHandleProps?: any;
  hasDateError?: boolean;
}

export function StopListItem({ 
  stop, 
  onEdit, 
  isFirst, 
  isLast, 
  dragHandleProps,
  hasDateError = false
}: StopListItemProps) {
  const getStopTypeAbbreviation = () => {
    return stop.stop_type === 'pickup' ? 'P' : 'D';
  };

  const getStopTypeColor = () => {
    return stop.stop_type === 'pickup' 
      ? 'bg-blue-500 text-white' 
      : 'bg-green-500 text-white';
  };

  const getStopTypeLabel = () => {
    if (isFirst) return 'Recogida';
    if (isLast) return 'Entrega';
    return stop.stop_type === 'pickup' ? 'Recogida' : 'Entrega';
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return null;
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'dd MMM', { locale: es });
    } catch {
      return null;
    }
  };

  const hasRequiredInfo = stop.company_name && stop.address && stop.city && stop.state;

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      hasDateError && "border-destructive bg-destructive/5",
      !hasRequiredInfo && "border-orange-200 bg-orange-50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
            <Grip className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Stop Type Badge */}
          <div className="flex items-center gap-2">
            <Badge className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold p-0", getStopTypeColor())}>
              {getStopTypeAbbreviation()}
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              #{stop.stop_number}
            </span>
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium truncate">
                {stop.company_name || 'Sin empresa'}
              </span>
              {stop.reference_number && (
                <Badge variant="outline" className="text-xs">
                  {stop.reference_number}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {stop.city && stop.state ? `${stop.city}, ${stop.state}` : 'Sin dirección'}
              </span>
            </div>

            {(stop.scheduled_date || stop.scheduled_time) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span>
                  {formatDate(stop.scheduled_date)}
                  {stop.scheduled_time && ` • ${stop.scheduled_time}`}
                </span>
              </div>
            )}
          </div>

          {/* Warnings */}
          <div className="flex items-center gap-2">
            {hasDateError && (
              <div title="Error en orden de fechas">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
            )}
            {!hasRequiredInfo && (
              <div title="Información incompleta">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
            )}
            
            {/* Edit Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Type Label on mobile */}
        <div className="sm:hidden mt-2">
          <span className="text-xs text-muted-foreground">
            {getStopTypeLabel()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}