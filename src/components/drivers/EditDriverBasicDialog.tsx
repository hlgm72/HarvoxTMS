import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFleetNotifications } from "@/components/notifications";
import { supabase } from "@/integrations/supabase/client";
import { createPhoneHandlers, handleTextBlur } from '@/lib/textUtils';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { es } from "date-fns/locale";
import { formatDateInUserTimeZone } from '@/lib/dateFormatting';

interface DriverBasicData {
  first_name: string;
  last_name: string;
  phone: string;
  driver_id: string;
  license_number: string;
  cdl_class: string;
  license_state: string;
  license_issue_date: Date | null;
  license_expiry_date: Date | null;
  hire_date: Date | null;
  date_of_birth: Date | null;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

interface EditDriverBasicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  driver: any;
  onSuccess: () => void;
}

export function EditDriverBasicDialog({ isOpen, onClose, driver, onSuccess }: EditDriverBasicDialogProps) {
  const { showSuccess, showError } = useFleetNotifications();
  const [loading, setLoading] = useState(false);
  const [driverData, setDriverData] = useState<DriverBasicData>({
    first_name: '',
    last_name: '',
    phone: '',
    driver_id: '',
    license_number: '',
    cdl_class: '',
    license_state: '',
    license_issue_date: null,
    license_expiry_date: null,
    hire_date: null,
    date_of_birth: null,
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  useEffect(() => {
    if (isOpen && driver) {
      loadDriverData();
    }
  }, [isOpen, driver]);

  const loadDriverData = async () => {
    if (!driver?.user_id) return;

    try {
      // Cargar perfil básico
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('user_id', driver.user_id)
        .maybeSingle();

      if (profileError) throw profileError;

      // Cargar perfil de conductor
      const { data: driverProfile, error: driverError } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', driver.user_id)
        .maybeSingle();

      if (driverError) throw driverError;

      setDriverData({
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        phone: profile?.phone || '',
        driver_id: driverProfile?.driver_id || '',
        license_number: driverProfile?.license_number || '',
        cdl_class: driverProfile?.cdl_class || '',
        license_state: driverProfile?.license_state || '',
        license_issue_date: driverProfile?.license_issue_date ? new Date(driverProfile.license_issue_date) : null,
        license_expiry_date: driverProfile?.license_expiry_date ? new Date(driverProfile.license_expiry_date) : null,
        hire_date: driverProfile?.hire_date ? new Date(driverProfile.hire_date) : null,
        date_of_birth: driverProfile?.date_of_birth ? new Date(driverProfile.date_of_birth) : null,
        emergency_contact_name: driverProfile?.emergency_contact_name || '',
        emergency_contact_phone: driverProfile?.emergency_contact_phone || '',
      });
    } catch (error) {
      console.error('Error loading driver data:', error);
      showError('Error al cargar los datos del conductor');
    }
  };

  const handleSave = async () => {
    if (!driver?.user_id) return;

    setLoading(true);
    try {
      // Limpiar datos de entrada
      const cleanedData = {
        first_name: handleTextBlur(driverData.first_name),
        last_name: handleTextBlur(driverData.last_name),
        phone: handleTextBlur(driverData.phone),
        driver_id: handleTextBlur(driverData.driver_id),
        license_number: handleTextBlur(driverData.license_number),
        cdl_class: handleTextBlur(driverData.cdl_class),
        license_state: handleTextBlur(driverData.license_state),
        emergency_contact_name: handleTextBlur(driverData.emergency_contact_name),
        emergency_contact_phone: handleTextBlur(driverData.emergency_contact_phone),
      };

      // Actualizar perfil básico
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: driver.user_id,
          first_name: cleanedData.first_name,
          last_name: cleanedData.last_name,
          phone: cleanedData.phone,
        }, {
          onConflict: 'user_id'
        });

      if (profileError) throw profileError;

      // Actualizar perfil de conductor
      const { error: driverError } = await supabase
        .from('driver_profiles')
        .upsert({
          user_id: driver.user_id,
          driver_id: cleanedData.driver_id,
          license_number: cleanedData.license_number,
          cdl_class: cleanedData.cdl_class,
          license_state: cleanedData.license_state,
          license_issue_date: driverData.license_issue_date ? formatDateInUserTimeZone(driverData.license_issue_date) : null,
          license_expiry_date: driverData.license_expiry_date ? formatDateInUserTimeZone(driverData.license_expiry_date) : null,
          hire_date: driverData.hire_date ? formatDateInUserTimeZone(driverData.hire_date) : null,
          date_of_birth: driverData.date_of_birth ? formatDateInUserTimeZone(driverData.date_of_birth) : null,
          emergency_contact_name: cleanedData.emergency_contact_name,
          emergency_contact_phone: cleanedData.emergency_contact_phone,
        }, {
          onConflict: 'user_id'
        });

      if (driverError) throw driverError;

      showSuccess('Información del conductor actualizada correctamente');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving driver data:', error);
      showError('Error al guardar los datos del conductor');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof DriverBasicData, value: any) => {
    setDriverData(prev => ({ ...prev, [field]: value }));
  };

  if (!driver) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Información del Conductor</DialogTitle>
          <DialogDescription>
            Modifica la información personal y profesional del conductor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Personal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información Personal</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  value={driverData.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  value={driverData.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  placeholder="Apellido"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={driverData.phone}
                  onChange={(e) => {
                    const handlers = createPhoneHandlers((value: string) => updateField('phone', value));
                    handlers.onChange(e);
                  }}
                  onKeyPress={(e) => {
                    const handlers = createPhoneHandlers((value: string) => updateField('phone', value));
                    handlers.onKeyPress(e);
                  }}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Fecha de Nacimiento</Label>
                <div>
                  <DatePicker
                    id="date_of_birth"
                    selected={driverData.date_of_birth}
                    onChange={(date: Date | null) => updateField('date_of_birth', date)}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Seleccionar fecha"
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    yearDropdownItemNumber={100}
                    scrollableYearDropdown
                    locale={es}
                    className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md block"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Información de Empleo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información de Empleo</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driver_id">ID del Conductor</Label>
                <Input
                  id="driver_id"
                  value={driverData.driver_id}
                  onChange={(e) => updateField('driver_id', e.target.value)}
                  placeholder="ID único del conductor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hire_date">Fecha de Contratación</Label>
                <div>
                  <DatePicker
                    id="hire_date"
                    selected={driverData.hire_date}
                    onChange={(date: Date | null) => updateField('hire_date', date)}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Seleccionar fecha"
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    yearDropdownItemNumber={50}
                    scrollableYearDropdown
                    locale={es}
                    className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md block"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Información de Licencia */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información de Licencia</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="license_number">Número de Licencia</Label>
                <Input
                  id="license_number"
                  value={driverData.license_number}
                  onChange={(e) => updateField('license_number', e.target.value)}
                  placeholder="Número de licencia CDL"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cdl_class">Clase de CDL</Label>
                <Input
                  id="cdl_class"
                  value={driverData.cdl_class}
                  onChange={(e) => updateField('cdl_class', e.target.value)}
                  placeholder="A, B, C"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_state">Estado de Emisión</Label>
                <Input
                  id="license_state"
                  value={driverData.license_state}
                  onChange={(e) => updateField('license_state', e.target.value)}
                  placeholder="TX, CA, FL, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_issue_date">Fecha de Emisión</Label>
                <div>
                  <DatePicker
                    id="license_issue_date"
                    selected={driverData.license_issue_date}
                    onChange={(date: Date | null) => updateField('license_issue_date', date)}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Seleccionar fecha"
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    yearDropdownItemNumber={50}
                    scrollableYearDropdown
                    locale={es}
                    className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md block"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_expiry_date">Fecha de Vencimiento</Label>
                <div>
                  <DatePicker
                    id="license_expiry_date"
                    selected={driverData.license_expiry_date}
                    onChange={(date: Date | null) => updateField('license_expiry_date', date)}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Seleccionar fecha"
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    yearDropdownItemNumber={50}
                    scrollableYearDropdown
                    locale={es}
                    className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md block"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contacto de Emergencia */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contacto de Emergencia</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name">Nombre del Contacto</Label>
                <Input
                  id="emergency_contact_name"
                  value={driverData.emergency_contact_name}
                  onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">Teléfono del Contacto</Label>
                <Input
                  id="emergency_contact_phone"
                  value={driverData.emergency_contact_phone}
                  onChange={(e) => {
                    const handlers = createPhoneHandlers((value: string) => updateField('emergency_contact_phone', value));
                    handlers.onChange(e);
                  }}
                  onKeyPress={(e) => {
                    const handlers = createPhoneHandlers((value: string) => updateField('emergency_contact_phone', value));
                    handlers.onKeyPress(e);
                  }}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}