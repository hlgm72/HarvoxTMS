import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, MapPin, Clock, User, Phone, Building, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

interface StopEditModalProps {
  stop: LoadStop | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<LoadStop>) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const TIME_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const h = hour.toString().padStart(2, '0');
  return [
    `${h}:00`,
    `${h}:30`
  ];
}).flat();

export function StopEditModal({ 
  stop, 
  isOpen, 
  onClose, 
  onSave, 
  isFirst = false, 
  isLast = false 
}: StopEditModalProps) {
  const [formData, setFormData] = useState<Partial<LoadStop>>({});
  const [isDateOpen, setIsDateOpen] = useState(false);

  // Initialize form data when stop changes
  React.useEffect(() => {
    if (stop) {
      setFormData({ ...stop });
    }
  }, [stop]);

  if (!stop) return null;

  const updateField = (field: keyof LoadStop, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log('💾 StopEditModal - handleSave called with formData:', formData);
    onSave(formData);
    onClose();
  };

  const getStopTypeLabel = () => {
    if (isFirst) return 'Recogida (Pickup)';
    if (isLast) return 'Entrega (Delivery)';
    return stop.stop_type === 'pickup' ? 'Recogida (Pickup)' : 'Entrega (Delivery)';
  };

  const getStopTypeColor = () => {
    return stop.stop_type === 'pickup' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const companyNameHandlers = createTextHandlers(
    (value) => updateField('company_name', value),
    'text'
  );

  const addressHandlers = createTextHandlers(
    (value) => updateField('address', value),
    'text'
  );

  const contactNameHandlers = createTextHandlers(
    (value) => updateField('contact_name', value),
    'text'
  );

  const phoneHandlers = createPhoneHandlers(
    (value) => updateField('contact_phone', value)
  );

  const referenceHandlers = createTextHandlers(
    (value) => updateField('reference_number', value.replace(/\s/g, '')),
    'text'
  );

  const zipHandlers = createTextHandlers(
    (value) => updateField('zip_code', value.replace(/\D/g, '')),
    'text'
  );

  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" />
      
      {/* Modal Content */}
      <div className="relative z-[101] bg-white rounded-lg border shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col space-y-1.5 text-center sm:text-left p-6 pb-0">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                Parada #{stop.stop_number}
              </h2>
              <p className="text-sm text-muted-foreground">
                Complete la información de la parada
              </p>
            </div>
            <Badge className={cn("text-xs ml-auto", getStopTypeColor())}>
              {getStopTypeLabel()}
            </Badge>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Programación */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Programación
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled-date">Fecha Programada *</Label>
                <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background border-input",
                        !formData.scheduled_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.scheduled_date ? format(formData.scheduled_date, "PPP", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                   <PopoverContent className="w-auto p-0 bg-background border-border">
                    <div className="space-y-3 p-4">
                      {/* Month/Year Selectors */}
                      <div className="flex gap-2">
                        <Select
                          value={(formData.scheduled_date?.getMonth() ?? new Date().getMonth()).toString()}
                          onValueChange={(value) => {
                            const currentDate = formData.scheduled_date || new Date();
                            const newDate = new Date(currentDate.getFullYear(), parseInt(value), currentDate.getDate());
                            updateField('scheduled_date', newDate);
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {format(new Date(2024, i, 1), 'MMMM', { locale: es })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <div className="relative">
                          <Input
                            type="number"
                            min={2020}
                            max={2030}
                            value={formData.scheduled_date?.getFullYear() ?? new Date().getFullYear()}
                            onChange={(e) => {
                              const year = parseInt(e.target.value);
                              if (year >= 2020 && year <= 2030) {
                                const currentDate = formData.scheduled_date || new Date();
                                const newDate = new Date(year, currentDate.getMonth(), currentDate.getDate());
                                updateField('scheduled_date', newDate);
                              }
                            }}
                            className="w-20 text-center"
                            placeholder="Año"
                          />
                        </div>
                      </div>
                      
                      {/* Calendar */}
                      <Calendar
                        mode="single"
                        selected={formData.scheduled_date}
                        onSelect={(date) => {
                          updateField('scheduled_date', date);
                          setIsDateOpen(false);
                        }}
                        month={formData.scheduled_date || new Date()}
                        onMonthChange={(date) => updateField('scheduled_date', date)}
                        className="p-0 pointer-events-auto"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Hora Programada</Label>
                <Select 
                  value={formData.scheduled_time || ''} 
                  onValueChange={(value) => updateField('scheduled_time', value)}
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
          </div>

          {/* Tipo de Parada */}
          {!isFirst && !isLast && (
            <div className="space-y-2">
              <Label>Tipo de Parada</Label>
              <Select
                value={formData.stop_type || stop.stop_type}
                onValueChange={(value: 'pickup' | 'delivery') => updateField('stop_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Recogida (Pickup)</SelectItem>
                  <SelectItem value="delivery">Entrega (Delivery)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Building className="h-4 w-4" />
              Información de la Empresa
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Empresa *</Label>
                <Input
                  id="company"
                  placeholder="Nombre de la empresa"
                  value={formData.company_name || ''}
                  onChange={companyNameHandlers.onChange}
                  onBlur={companyNameHandlers.onBlur}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Número de Referencia</Label>
                <Input
                  id="reference"
                  placeholder="Número de Pickup/Delivery"
                  value={formData.reference_number || ''}
                  onChange={referenceHandlers.onChange}
                  onBlur={referenceHandlers.onBlur}
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Dirección
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="address">Dirección *</Label>
              <Input
                id="address"
                placeholder="Dirección completa"
                value={formData.address || ''}
                onChange={addressHandlers.onChange}
                onBlur={addressHandlers.onBlur}
              />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <StateCombobox
                    value={formData.state || ''}
                    onValueChange={(value) => {
                      updateField('state', value);
                      updateField('city', ''); // Reset city when state changes
                    }}
                    placeholder="Selecciona estado..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ciudad *</Label>
                  <CityCombobox
                    value={formData.city || ''}
                    onValueChange={(value) => updateField('city', value)}
                    stateId={formData.state || ''}
                    placeholder="Selecciona ciudad..."
                    disabled={!formData.state}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    placeholder="12345"
                    value={formData.zip_code || ''}
                    onChange={zipHandlers.onChange}
                    onBlur={zipHandlers.onBlur}
                    maxLength={5}
                  />
                </div>
                <div></div>
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Información de Contacto
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact">Nombre de Contacto</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="contact"
                    placeholder="Nombre del contacto"
                    className="pl-10"
                    value={formData.contact_name || ''}
                    onChange={contactNameHandlers.onChange}
                    onBlur={contactNameHandlers.onBlur}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono de Contacto</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="(555) 123-4567"
                    className="pl-10"
                    value={formData.contact_phone || ''}
                    onChange={phoneHandlers.onChange}
                    onKeyPress={phoneHandlers.onKeyPress}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Instrucciones Especiales */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Instrucciones Especiales
            </h3>
            
            <div className="space-y-2">
              <Textarea
                placeholder="Instrucciones especiales para esta parada..."
                value={formData.special_instructions || ''}
                onChange={(e) => updateField('special_instructions', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 pt-0 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  );
}