
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Edit, Calendar, Clock, Building, Phone, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadStop } from '@/hooks/useLoadStops';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface StopListItemProps {
  stop: LoadStop;
  onEdit: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  hasDateError?: boolean;
}

export function StopListItem({ 
  stop, 
  onEdit, 
  isFirst = false, 
  isLast = false, 
  hasDateError = false 
}: StopListItemProps) {
  const getStopTypeLabel = () => {
    if (isFirst) return 'Recogida';
    if (isLast) return 'Entrega';
    return stop.stop_type === 'pickup' ? 'Recogida' : 'Entrega';
  };

  const getStopTypeColor = () => {
    return stop.stop_type === 'pickup' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  // Format the address properly, ensuring city is displayed correctly
  const formatAddress = () => {
    const parts = [];
    
    if (stop.address) {
      parts.push(stop.address);
    }
    
    if (stop.city) {
      // Make sure we're displaying the city name, not an ID
      const cityName = typeof stop.city === 'string' ? stop.city : '';
      if (cityName && !cityName.includes('-') && cityName.length < 50) {
        parts.push(cityName);
      }
    }
    
    if (stop.state) {
      parts.push(stop.state);
    }
    
    if (stop.zip_code) {
      parts.push(stop.zip_code);
    }
    
    return parts.join(', ') || 'Dirección incompleta';
  };

  return (
    <div className={cn(
      "border rounded-lg p-4 bg-background transition-colors",
      hasDateError && "border-destructive bg-destructive/5"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Parada #{stop.stop_number}</span>
          </div>
          <Badge className={cn("text-xs", getStopTypeColor())}>
            {getStopTypeLabel()}
          </Badge>
          {hasDateError && (
            <Badge variant="destructive" className="text-xs">
              Error de fecha
            </Badge>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-8 px-2"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 text-sm">
        {/* Company */}
        {stop.company_name && (
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium">{stop.company_name}</span>
          </div>
        )}

        {/* Address */}
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-muted-foreground">
            {formatAddress()}
          </div>
        </div>

        {/* Reference Number */}
        {stop.reference_number && (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">{stop.reference_number}</span>
          </div>
        )}

        {/* Date and Time */}
        {(stop.scheduled_date || stop.scheduled_time) && (
          <div className="flex items-center gap-4 text-muted-foreground">
            {stop.scheduled_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(stop.scheduled_date, 'dd MMM yyyy', { locale: es })}</span>
              </div>
            )}
            {stop.scheduled_time && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{stop.scheduled_time}</span>
              </div>
            )}
          </div>
        )}

        {/* Contact Info */}
        {(stop.contact_name || stop.contact_phone) && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              {stop.contact_name && stop.contact_phone 
                ? `${stop.contact_name} - ${stop.contact_phone}`
                : stop.contact_name || stop.contact_phone
              }
            </span>
          </div>
        )}

        {/* Special Instructions */}
        {stop.special_instructions && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <strong>Instrucciones:</strong> {stop.special_instructions}
          </div>
        )}
      </div>
    </div>
  );
}
