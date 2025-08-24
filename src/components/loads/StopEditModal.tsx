import React, { useState } from 'react';
import { format } from 'date-fns';
import { formatPrettyDate, formatMonthName } from '@/lib/dateFormatting';
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
import { AddressForm } from '@/components/ui/AddressForm';
import { cn } from '@/lib/utils';
import { LoadStop } from '@/hooks/useLoadStops';
import { createTextHandlers, createPhoneHandlers } from '@/lib/textUtils';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
    // console.log('💾 StopEditModal - handleSave called with formData:', formData);
    onSave(formData);
    onClose();
  };

  const getStopTypeLabel = () => {
    if (isFirst) return t("loads:create_wizard.phases.route_details.edit_modal.pickup_label");
    if (isLast) return t("loads:create_wizard.phases.route_details.edit_modal.delivery_label");
    return stop.stop_type === 'pickup' ? t("loads:create_wizard.phases.route_details.edit_modal.pickup_label") : t("loads:create_wizard.phases.route_details.edit_modal.delivery_label");
  };

  const getStopTypeColor = () => {
    if (isFirst) return 'bg-green-100 text-green-800'; // Verde para pickup inicial
    if (isLast) return 'bg-red-100 text-red-800'; // Rojo para entrega final
    return 'bg-blue-100 text-blue-800'; // Azul para paradas intermedias
  };

  const companyNameHandlers = createTextHandlers(
    (value) => updateField('company_name', value),
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
                {t("loads:create_wizard.phases.route_details.edit_modal.title", { number: stop.stop_number })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("loads:create_wizard.phases.route_details.edit_modal.description")}
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
              {t("loads:create_wizard.phases.route_details.edit_modal.scheduling")}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled-date">{t("loads:create_wizard.phases.route_details.edit_modal.scheduled_date_required")}</Label>
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
                      {formData.scheduled_date ? formatPrettyDate(formData.scheduled_date) : t("loads:create_wizard.phases.route_details.edit_modal.select_date")}
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
                                {formatMonthName(new Date(2024, i, 1))}
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
                            placeholder={t("loads:create_wizard.phases.route_details.edit_modal.year_placeholder")}
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
                <Label>{t("loads:create_wizard.phases.route_details.edit_modal.scheduled_time")}</Label>
                <Select 
                  value={formData.scheduled_time || ''} 
                  onValueChange={(value) => updateField('scheduled_time', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("loads:create_wizard.phases.route_details.edit_modal.select_time")} />
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
              <Label>{t("loads:create_wizard.phases.route_details.edit_modal.stop_type")}</Label>
              <Select
                value={formData.stop_type || stop.stop_type}
                onValueChange={(value: 'pickup' | 'delivery') => updateField('stop_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">{t("loads:create_wizard.phases.route_details.edit_modal.pickup_label")}</SelectItem>
                  <SelectItem value="delivery">{t("loads:create_wizard.phases.route_details.edit_modal.delivery_label")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Building className="h-4 w-4" />
              {t("loads:create_wizard.phases.route_details.edit_modal.company_info")}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">{t("loads:create_wizard.phases.route_details.edit_modal.company_required")}</Label>
                <Input
                  id="company"
                  placeholder={t("loads:create_wizard.phases.route_details.edit_modal.company_placeholder")}
                  value={formData.company_name || ''}
                  onChange={companyNameHandlers.onChange}
                  onBlur={companyNameHandlers.onBlur}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">{t("loads:create_wizard.phases.route_details.edit_modal.reference_number")}</Label>
                <Input
                  id="reference"
                  placeholder={t("loads:create_wizard.phases.route_details.edit_modal.reference_placeholder")}
                  value={formData.reference_number || ''}
                  onChange={referenceHandlers.onChange}
                  onBlur={referenceHandlers.onBlur}
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-4">
            <AddressForm
              streetAddress={formData.address || ''}
              onStreetAddressChange={(value) => updateField('address', value)}
              stateId={formData.state || ''}
              onStateChange={(value) => {
                updateField('state', value);
                updateField('city', ''); // Reset city when state changes
              }}
              city={formData.city || ''}
              onCityChange={(value) => updateField('city', value)}
              zipCode={formData.zip_code || ''}
              onZipCodeChange={(value) => updateField('zip_code', value)}
              streetAddressLabel={t("loads:create_wizard.phases.route_details.edit_modal.address_label")}
              stateLabel={t("loads:create_wizard.phases.route_details.edit_modal.state_label")}
              cityLabel={t("loads:create_wizard.phases.route_details.edit_modal.city_label")}
              zipCodeLabel={t("loads:create_wizard.phases.route_details.edit_modal.zip_label")}
              required={true}
            />
          </div>

          {/* Contacto */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              {t("loads:create_wizard.phases.route_details.edit_modal.contact_info")}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact">{t("loads:create_wizard.phases.route_details.edit_modal.contact_name")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="contact"
                    placeholder={t("loads:create_wizard.phases.route_details.edit_modal.contact_name_placeholder")}
                    className="pl-10"
                    value={formData.contact_name || ''}
                    onChange={contactNameHandlers.onChange}
                    onBlur={contactNameHandlers.onBlur}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("loads:create_wizard.phases.route_details.edit_modal.contact_phone")}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder={t("loads:create_wizard.phases.route_details.edit_modal.contact_phone_placeholder")}
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
              {t("loads:create_wizard.phases.route_details.edit_modal.special_instructions")}
            </h3>
            
            <div className="space-y-2">
              <Textarea
                placeholder={t("loads:create_wizard.phases.route_details.edit_modal.instructions_placeholder")}
                value={formData.special_instructions || ''}
                onChange={(e) => updateField('special_instructions', e.target.value)}
                rows={2}
                className="h-16 min-h-16 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 pt-0 border-t">
          <Button variant="outline" onClick={onClose}>
            {t("loads:create_wizard.phases.route_details.edit_modal.cancel")}
          </Button>
          <Button onClick={handleSave}>
            {t("loads:create_wizard.phases.route_details.edit_modal.save_changes")}
          </Button>
        </div>
      </div>
    </div>
  );
}