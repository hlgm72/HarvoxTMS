import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Grip, Trash2, MapPin, Clock, User, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StateCombobox } from '@/components/ui/StateCombobox';
import { CityCombobox } from '@/components/ui/CityCombobox';
import { cn } from '@/lib/utils';
import { LoadStop } from '@/hooks/useLoadStops';
import { createTextHandlers, createPhoneHandlers } from '@/lib/textUtils';

interface StopFormCardProps {
  stop: LoadStop;
  onUpdate: (updates: Partial<LoadStop>) => void;
  onRemove: () => void;
  canRemove: boolean;
  isFirst: boolean;
  isLast: boolean;
  dragHandleProps?: any;
}


const TIME_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const h = hour.toString().padStart(2, '0');
  return [
    `${h}:00`,
    `${h}:30`
  ];
}).flat();

export function StopFormCard({ 
  stop, 
  onUpdate, 
  onRemove, 
  canRemove, 
  isFirst, 
  isLast,
  dragHandleProps 
}: StopFormCardProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const companyNameHandlers = createTextHandlers(
    (value) => onUpdate({ company_name: value }),
    'text'
  );

  const addressHandlers = createTextHandlers(
    (value) => onUpdate({ address: value }),
    'text'
  );


  const contactNameHandlers = createTextHandlers(
    (value) => onUpdate({ contact_name: value }),
    'text'
  );

  const phoneHandlers = createPhoneHandlers(
    (value) => onUpdate({ contact_phone: value })
  );

  const referenceHandlers = createTextHandlers(
    (value) => onUpdate({ reference_number: value.replace(/\s/g, '') }),
    'text'
  );

  const zipHandlers = createTextHandlers(
    (value) => onUpdate({ zip_code: value.replace(/\D/g, '') }),
    'text'
  );

  const getStopTypeLabel = () => {
    if (isFirst) return 'Recogida (Pickup)';
    if (isLast) return 'Entrega (Delivery)';
    return stop.stop_type === 'pickup' ? 'Recogida (Pickup)' : 'Entrega (Delivery)';
  };

  const getStopTypeColor = () => {
    return stop.stop_type === 'pickup' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div {...dragHandleProps} className="cursor-grab">
              <Grip className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Parada #{stop.stop_number}</CardTitle>
            </div>
            <Badge className={cn("text-xs", getStopTypeColor())}>
              {getStopTypeLabel()}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {!isFirst && !isLast && (
              <Select
                value={stop.stop_type}
                onValueChange={(value: 'pickup' | 'delivery') => onUpdate({ stop_type: value })}
              >
                <SelectTrigger className="w-auto h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {canRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Company Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`company-${stop.id}`}>Empresa *</Label>
            <Input
              id={`company-${stop.id}`}
              placeholder="Nombre de la empresa"
              value={stop.company_name}
              onChange={companyNameHandlers.onChange}
              onBlur={companyNameHandlers.onBlur}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`reference-${stop.id}`}>Número de Referencia</Label>
            <Input
              id={`reference-${stop.id}`}
              placeholder="BOL, PO, etc."
              value={stop.reference_number || ''}
              onChange={referenceHandlers.onChange}
              onBlur={referenceHandlers.onBlur}
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor={`address-${stop.id}`}>Dirección *</Label>
          <Input
            id={`address-${stop.id}`}
            placeholder="Dirección completa"
            value={stop.address}
            onChange={addressHandlers.onChange}
            onBlur={addressHandlers.onBlur}
          />
        </div>

        {/* State, City, ZIP */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Estado *</Label>
            <StateCombobox
              value={stop.state}
              onValueChange={(value) => {
                onUpdate({ state: value, city: '' }); // Reset city when state changes
              }}
              placeholder="Selecciona estado..."
            />
          </div>

          <div className="space-y-2">
            <Label>Ciudad *</Label>
            <CityCombobox
              value={stop.city}
              onValueChange={(value) => onUpdate({ city: value })}
              stateId={stop.state}
              placeholder="Selecciona ciudad..."
              disabled={!stop.state}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`zip-${stop.id}`}>ZIP</Label>
            <Input
              id={`zip-${stop.id}`}
              placeholder="12345"
              value={stop.zip_code || ''}
              onChange={zipHandlers.onChange}
              onBlur={zipHandlers.onBlur}
              maxLength={5}
            />
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`scheduled-date-${stop.id}`}>Fecha Programada</Label>
            <Input
              id={`scheduled-date-${stop.id}`}
              type="date"
              value={stop.scheduled_date ? format(stop.scheduled_date, "yyyy-MM-dd") : ''}
              onChange={(e) => {
                if (e.target.value) {
                  // Crear fecha en zona horaria local para evitar problemas de offset
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  const dateValue = new Date(year, month - 1, day);
                  onUpdate({ scheduled_date: dateValue });
                } else {
                  onUpdate({ scheduled_date: null });
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Hora Programada</Label>
            <Select 
              value={stop.scheduled_time || ''} 
              onValueChange={(value) => onUpdate({ scheduled_time: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar hora" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map(time => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full"
        >
          {showAdvanced ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
        </Button>

        {/* Advanced Fields */}
        {showAdvanced && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`contact-${stop.id}`}>Nombre de Contacto</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={`contact-${stop.id}`}
                    placeholder="Nombre del contacto"
                    className="pl-10"
                    value={stop.contact_name || ''}
                    onChange={contactNameHandlers.onChange}
                    onBlur={contactNameHandlers.onBlur}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`phone-${stop.id}`}>Teléfono de Contacto</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={`phone-${stop.id}`}
                    placeholder="(555) 123-4567"
                    className="pl-10"
                    value={stop.contact_phone || ''}
                    onChange={phoneHandlers.onChange}
                    onKeyPress={phoneHandlers.onKeyPress}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`instructions-${stop.id}`}>Instrucciones Especiales</Label>
              <Textarea
                id={`instructions-${stop.id}`}
                placeholder="Instrucciones especiales para esta parada..."
                value={stop.special_instructions || ''}
                onChange={(e) => onUpdate({ special_instructions: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}