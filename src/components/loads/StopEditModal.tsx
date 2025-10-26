import React, { useState } from 'react';
import { format } from 'date-fns';
import { formatPrettyDate } from '@/lib/dateFormatting';
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
import { AddressForm } from '@/components/ui/AddressForm';
import { CompanyAutocompleteInput } from '@/components/ui/CompanyAutocompleteInput';
import { TimePicker } from '@/components/ui/TimePicker';
import { cn } from '@/lib/utils';
import { LoadStop } from '@/hooks/useLoadStops';
import { createTextHandlers, createPhoneHandlers } from '@/lib/textUtils';
import { useTranslation } from 'react-i18next';
import { FacilityCombobox } from '@/components/facilities/FacilityCombobox';
import { CreateFacilityDialog } from '@/components/facilities/CreateFacilityDialog';
import { useFacilities, Facility } from '@/hooks/useFacilities';

interface StopEditModalProps {
  stop: LoadStop | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<LoadStop>) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

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
  const [showCreateFacility, setShowCreateFacility] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | undefined>(undefined);
  
  const { data: facilities = [] } = useFacilities();
  const selectedFacility = facilities.find(f => f.id === formData.facility_id);

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

  const handleFacilitySelect = (facilityId: string | null, facility?: Facility) => {
    if (facility) {
      setFormData(prev => ({
        ...prev,
        facility_id: facilityId,
        company_name: facility.name
      }));
    } else {
      // Clear facility
      setFormData(prev => ({
        ...prev,
        facility_id: null
      }));
    }
  };

  const handleEditFacility = (facility: Facility) => {
    setEditingFacility(facility);
    setShowCreateFacility(true);
  };

  const handleCloseFacilityDialog = () => {
    setShowCreateFacility(false);
    setEditingFacility(undefined);
  };

  const handleCompanySelect = (company: {
    value: string;
    label: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    phone?: string;
  }) => {
    setFormData(prev => ({
      ...prev,
      facility_id: null, // Clear facility when manually entering company
      company_name: company.label
    }));
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header - Fixed */}
        <div className="flex flex-col space-y-1.5 p-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <DialogTitle>
                {t("loads:create_wizard.phases.route_details.edit_modal.title", { number: stop.stop_number })}
              </DialogTitle>
              <DialogDescription>
                {t("loads:create_wizard.phases.route_details.edit_modal.description")}
              </DialogDescription>
            </div>
            <Badge className={cn("text-xs ml-auto", getStopTypeColor())}>
              {getStopTypeLabel()}
            </Badge>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-white dark:bg-gray-900">
          {/* Programación */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t("loads:create_wizard.phases.route_details.edit_modal.scheduling")}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled-date">
                  {t("loads:create_wizard.phases.route_details.edit_modal.scheduled_date")} <span className="text-destructive">*</span>
                </Label>
                <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.scheduled_date && "text-muted-foreground"
                      )}
                    >
                      {formData.scheduled_date ? (
                        formatPrettyDate(formData.scheduled_date)
                      ) : (
                        <span>{t("loads:create_wizard.phases.route_details.edit_modal.select_date")}</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <div className="pointer-events-auto">
                      <Calendar
                        mode="single"
                        selected={formData.scheduled_date}
                        defaultMonth={formData.scheduled_date}
                        onSelect={(date) => {
                          updateField('scheduled_date', date);
                          setIsDateOpen(false);
                        }}
                        onToday={() => {
                          updateField('scheduled_date', new Date());
                          setIsDateOpen(false);
                        }}
                        disableClear={true}
                        fromYear={2020}
                        toYear={2030}
                        initialFocus
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <TimePicker
                id="scheduled-time"
                value={formData.scheduled_time || ''}
                onChange={(value) => updateField('scheduled_time', value)}
                placeholder={t("loads:create_wizard.phases.route_details.edit_modal.select_time")}
                label={t("loads:create_wizard.phases.route_details.edit_modal.scheduled_time")}
              />
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
            
            {/* Facility Selector */}
            <div className="space-y-2">
              <Label>{t("loads:create_wizard.phases.route_details.edit_modal.facility_label")}</Label>
              <FacilityCombobox
                value={formData.facility_id || null}
                onValueChange={handleFacilitySelect}
                onCreateNew={() => {
                  setEditingFacility(undefined);
                  setShowCreateFacility(true);
                }}
                onEdit={handleEditFacility}
              />
              <p className="text-xs text-muted-foreground">
                {formData.facility_id 
                  ? t("loads:create_wizard.phases.route_details.edit_modal.facility_selected_help")
                  : t("loads:create_wizard.phases.route_details.edit_modal.facility_help")
                }
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <CompanyAutocompleteInput
                  value={formData.company_name || ''}
                  onChange={(value) => {
                    if (!formData.facility_id) {
                      updateField('company_name', value);
                    }
                  }}
                  onCompanySelect={handleCompanySelect}
                  placeholder={t("loads:create_wizard.phases.route_details.edit_modal.company_placeholder")}
                  label={t("loads:create_wizard.phases.route_details.edit_modal.company_required")}
                  required
                />
                {formData.facility_id && (
                  <p className="text-xs text-muted-foreground">
                    {t("loads:create_wizard.phases.route_details.edit_modal.company_from_facility")}
                  </p>
                )}
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

          {/* Dirección - Mostrar info de facility si está seleccionada, sino permitir editar */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {t("loads:create_wizard.phases.route_details.edit_modal.address_label")}
            </h3>
            
            {selectedFacility ? (
              /* Mostrar info de facility en modo lectura */
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("loads:create_wizard.phases.route_details.edit_modal.address_label")}</p>
                    <p className="text-sm font-medium">{selectedFacility.address}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("loads:create_wizard.phases.route_details.edit_modal.city_label")}</p>
                      <p className="text-sm font-medium">{selectedFacility.city}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("loads:create_wizard.phases.route_details.edit_modal.state_label")}</p>
                      <p className="text-sm font-medium">{selectedFacility.state}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("loads:create_wizard.phases.route_details.edit_modal.zip_label")}</p>
                    <p className="text-sm font-medium">{selectedFacility.zip_code}</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Formulario editable si NO hay facility */
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
            )}
          </div>

          {/* Contacto - Mostrar info de facility si está seleccionada, sino permitir editar */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              {t("loads:create_wizard.phases.route_details.edit_modal.contact_info")}
            </h3>
            
            {selectedFacility ? (
              /* Mostrar info de contacto de facility en modo lectura */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border">
                <div>
                  <p className="text-xs text-muted-foreground">{t("loads:create_wizard.phases.route_details.edit_modal.contact_name")}</p>
                  <p className="text-sm font-medium">{selectedFacility.contact_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("loads:create_wizard.phases.route_details.edit_modal.contact_phone")}</p>
                  <p className="text-sm font-medium">{selectedFacility.contact_phone || '-'}</p>
                </div>
              </div>
            ) : (
              /* Formulario editable si NO hay facility */
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
            )}
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
                onChange={(e) => {
                  const value = e.target.value;
                  // Enforce max length
                  if (value.length <= 500) {
                    updateField('special_instructions', value);
                  }
                }}
                rows={2}
                className="h-16 min-h-16 resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{(formData.special_instructions || '').length}/500</p>
            </div>
          </div>
        </div>

        {/* Actions - Fixed */}
        <div className="flex justify-end gap-3 p-4 border-t flex-shrink-0 bg-background">
          <Button variant="outline" onClick={onClose}>
            {t("loads:create_wizard.phases.route_details.edit_modal.cancel")}
          </Button>
          <Button onClick={handleSave}>
            {t("loads:create_wizard.phases.route_details.edit_modal.save_changes")}
          </Button>
        </div>
      </DialogContent>

      {/* Create/Edit Facility Dialog */}
      <CreateFacilityDialog
        isOpen={showCreateFacility}
        onClose={handleCloseFacilityDialog}
        facility={editingFacility}
      />
    </Dialog>
  );
}