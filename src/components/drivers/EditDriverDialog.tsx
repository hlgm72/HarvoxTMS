import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StateCombobox } from "@/components/ui/StateCombobox";
import { User, Truck, IdCard, Phone, Calendar, Shield } from "lucide-react";
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
import { enUS, es } from "date-fns/locale";
import { formatDateInUserTimeZone } from '@/lib/dateFormatting';
import { LicenseInfoSection } from '@/components/drivers/LicenseInfoSection';
import { useTranslation } from 'react-i18next';

// Función simple para formatear fechas para la base de datos sin problemas de zona horaria
const formatDateForDatabase = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Función segura para parsear fechas desde la base de datos evitando problemas de zona horaria
const parseDateFromDatabase = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  
  try {
    // Extraer año, mes, día directamente para evitar problemas de zona horaria
    let year: number, month: number, day: number;
    
    if (dateString.includes('T') || dateString.includes('Z')) {
      // Formato ISO: extraer solo la parte de fecha
      const datePart = dateString.split('T')[0];
      [year, month, day] = datePart.split('-').map(Number);
    } else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Formato solo fecha: YYYY-MM-DD
      [year, month, day] = dateString.split('-').map(Number);
    } else {
      return null;
    }
    
    // Validar que los valores sean números válidos
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }
    
    // Crear fecha local evitando zona horaria UTC
    return new Date(year, month - 1, day);
  } catch (error) {
    console.error('Error parsing date from database:', error);
    return null;
  }
};

interface DriverData {
  // Información personal básica
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: Date | null;
  
  // Información de empleo
  driver_id: string;
  hire_date: Date | null;
  
  // Información de licencia
  license_number: string;
  cdl_class: string;
  cdl_endorsements: string;
  license_state: string;
  license_issue_date: Date | null;
  license_expiry_date: Date | null;
  
  // Contacto de emergencia
  emergency_contact_name: string;
  emergency_contact_phone: string;
  
  // Owner operator status
  is_owner_operator: boolean;
  
  // Owner operator data
  business_name: string;
  business_type: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  tax_id: string;
  dispatching_percentage: number;
  factoring_percentage: number;
  leasing_percentage: number;
  insurance_pay: number;
}

interface EditDriverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  driver: any;
  onSuccess: () => void;
}

export function EditDriverDialog({ isOpen, onClose, driver, onSuccess }: EditDriverDialogProps) {
  const { i18n } = useTranslation();
  const { showSuccess, showError } = useFleetNotifications();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [activeOwnerTab, setActiveOwnerTab] = useState('business');
  
  const [driverData, setDriverData] = useState<DriverData>({
    // Información personal básica
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: null,
    
    // Información de empleo
    driver_id: '',
    hire_date: null,
    
    // Información de licencia
    license_number: '',
    cdl_class: '',
    cdl_endorsements: '',
    license_state: '',
    license_issue_date: null,
    license_expiry_date: null,
    
    // Contacto de emergencia
    emergency_contact_name: '',
    emergency_contact_phone: '',
    
    // Owner operator
    is_owner_operator: false,
    business_name: '',
    business_type: '',
    business_address: '',
    business_phone: '',
    business_email: '',
    tax_id: '',
    dispatching_percentage: 0,
    factoring_percentage: 0,
    leasing_percentage: 0,
    insurance_pay: 0,
  });

  useEffect(() => {
    if (isOpen && driver) {
      loadDriverData();
    }
  }, [isOpen, driver]);

  const loadDriverData = async () => {
    if (!driver) return;

    setLoading(true);
    try {
      // Si el driver tiene user_id vacío (es una invitación pendiente), 
      // buscar datos en user_invitations usando el driver.id como email identifier
      if (!driver.user_id || driver.user_id === '') {
        // Para invitaciones pendientes, extraer el email del ID
        const email = driver.id.startsWith('invitation-') 
          ? driver.id.substring('invitation-'.length) 
          : driver.id;
          
        // Buscar en user_invitations
        const { data: invitation, error: invitationError } = await supabase
          .from('user_invitations')
          .select('first_name, last_name, email, metadata')
          .eq('email', email)
          .eq('role', 'driver')
          .is('accepted_at', null)
          .maybeSingle();

        if (invitationError) {
          console.error('Error loading invitation data:', invitationError);
        }

        if (invitation) {
          // Extraer datos del metadata si existe
          const metadata = invitation.metadata as any || {};
          
          setDriverData({
            // Información personal básica desde la invitación
            first_name: invitation.first_name || '',
            last_name: invitation.last_name || '',
            phone: metadata.phone || '',
            date_of_birth: metadata.date_of_birth ? parseDateFromDatabase(metadata.date_of_birth) : null,
            
            // Información de empleo
            driver_id: metadata.driver_id || '',
            hire_date: metadata.hire_date ? parseDateFromDatabase(metadata.hire_date) : null,
            
            // Información de licencia
            license_number: metadata.license_number || '',
            cdl_class: metadata.cdl_class || '',
            cdl_endorsements: metadata.cdl_endorsements || '',
            license_state: metadata.license_state || '',
            license_issue_date: metadata.license_issue_date ? parseDateFromDatabase(metadata.license_issue_date) : null,
            license_expiry_date: metadata.license_expiry_date ? parseDateFromDatabase(metadata.license_expiry_date) : null,
            
            // Contacto de emergencia
            emergency_contact_name: metadata.emergency_contact_name || '',
            emergency_contact_phone: metadata.emergency_contact_phone || '',
            
            // Owner operator (por defecto false para invitaciones)
            is_owner_operator: false,
            business_name: '',
            business_type: '',
            business_address: '',
            business_phone: '',
            business_email: '',
            tax_id: '',
            dispatching_percentage: 0,
            factoring_percentage: 0,
            leasing_percentage: 0,
            insurance_pay: 0,
          });
          setLoading(false);
          return;
        }
      }

      // Para conductores ya activados, buscar en las tablas de perfil
      // Cargar perfil básico (incluyendo hire_date y date_of_birth)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, hire_date, date_of_birth')
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

      // Cargar datos de owner operator
      const { data: ownerOperator, error: ownerOperatorError } = await supabase
        .from('owner_operators')
        .select('*')
        .eq('user_id', driver.user_id)
        .maybeSingle();

      if (ownerOperatorError) throw ownerOperatorError;

      // Si ya es un Owner Operator existente, usar sus valores guardados
      const hasExistingOO = ownerOperator && ownerOperator.is_active;

      setDriverData({
        // Información personal básica
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        phone: profile?.phone || '',
        date_of_birth: parseDateFromDatabase(profile?.date_of_birth),
        
        // Información de empleo - ahora desde profiles
        driver_id: driverProfile?.driver_id || '',
        hire_date: parseDateFromDatabase(profile?.hire_date),
        
        // Información de licencia
        license_number: driverProfile?.license_number || '',
        cdl_class: driverProfile?.cdl_class || '',
        cdl_endorsements: driverProfile?.cdl_endorsements || '',
        license_state: driverProfile?.license_state || '',
        license_issue_date: parseDateFromDatabase(driverProfile?.license_issue_date),
        license_expiry_date: parseDateFromDatabase(driverProfile?.license_expiry_date),
        
        // Contacto de emergencia
        emergency_contact_name: driverProfile?.emergency_contact_name || '',
        emergency_contact_phone: driverProfile?.emergency_contact_phone || '',
        
        // Owner operator
        is_owner_operator: hasExistingOO,
        business_name: ownerOperator?.business_name || '',
        business_type: ownerOperator?.business_type || '',
        business_address: ownerOperator?.business_address || '',
        business_phone: ownerOperator?.business_phone || '',
        business_email: ownerOperator?.business_email || '',
        tax_id: ownerOperator?.tax_id || '',
        dispatching_percentage: hasExistingOO ? ownerOperator.dispatching_percentage : 0,
        factoring_percentage: hasExistingOO ? ownerOperator.factoring_percentage : 0,
        leasing_percentage: hasExistingOO ? ownerOperator.leasing_percentage : 0,
        insurance_pay: ownerOperator?.insurance_pay || 0,
      });
    } catch (error) {
      console.error('Error loading driver data:', error);
      showError('Error loading driver data');
    } finally {
      setLoading(false);
    }
  };

  const updateDriverData = async (field: keyof DriverData, value: any) => {
    if (field === 'is_owner_operator' && value === true) {
      // Solo aplicar defaults si no tiene valores previos (nuevo OO)
      const hasExistingValues = driverData.dispatching_percentage > 0 || 
                                driverData.factoring_percentage > 0 || 
                                driverData.leasing_percentage > 0;
      
      if (hasExistingValues) {
        setDriverData(prev => ({ ...prev, [field]: value }));
        return;
      }

      // Si no tiene valores previos, cargar defaults de la compañía
      try {
        // Obtener roles del usuario para encontrar la compañía
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', driver.user_id)
          .eq('is_active', true);

        if (rolesError) {
          console.warn('Error al obtener roles de usuario:', rolesError);
          throw rolesError;
        }

        if (userRoles && userRoles.length > 0) {
          // Usar el primer company_id encontrado
          const companyId = userRoles[0].company_id;
          
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('default_dispatching_percentage, default_factoring_percentage, default_leasing_percentage')
            .eq('id', companyId)
            .single();

          if (companyError) {
            console.warn('Error al cargar datos de la compañía:', companyError);
            throw companyError;
          }

          if (companyData) {
            setDriverData(prev => ({
              ...prev,
              [field]: value,
              dispatching_percentage: companyData.default_dispatching_percentage || 0,
              factoring_percentage: companyData.default_factoring_percentage || 0,
              leasing_percentage: companyData.default_leasing_percentage || 0,
            }));
            return;
          }
        }
      } catch (error) {
        console.warn('Error cargando valores de la compañía, usando valores por defecto:', error);
      }
      
      // Fallback: usar valores por defecto si hay error
      setDriverData(prev => ({
        ...prev,
        [field]: value,
        dispatching_percentage: prev.dispatching_percentage || 5.00,
        factoring_percentage: prev.factoring_percentage || 3.00,
        leasing_percentage: prev.leasing_percentage || 5.00,
      }));
      return;
    }

    setDriverData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!driver) return;

    setSaving(true);
    try {
      // Si es una invitación pendiente (sin user_id), actualizar la invitación
      if (!driver.user_id || driver.user_id === '') {
        const email = driver.id.startsWith('invitation-') 
          ? driver.id.substring('invitation-'.length) 
          : driver.id;

        // Crear metadata con todos los campos del formulario
        const metadata = {
          phone: handleTextBlur(driverData.phone),
          date_of_birth: driverData.date_of_birth ? formatDateForDatabase(driverData.date_of_birth) : null,
          driver_id: handleTextBlur(driverData.driver_id),
          hire_date: driverData.hire_date ? formatDateForDatabase(driverData.hire_date) : null,
          license_number: handleTextBlur(driverData.license_number),
          cdl_class: handleTextBlur(driverData.cdl_class),
          cdl_endorsements: driverData.cdl_endorsements,
          license_state: handleTextBlur(driverData.license_state),
          license_issue_date: driverData.license_issue_date ? formatDateForDatabase(driverData.license_issue_date) : null,
          license_expiry_date: driverData.license_expiry_date ? formatDateForDatabase(driverData.license_expiry_date) : null,
          emergency_contact_name: handleTextBlur(driverData.emergency_contact_name),
          emergency_contact_phone: handleTextBlur(driverData.emergency_contact_phone),
        };

        // Actualizar la invitación con los nuevos datos
        const { error: invitationError } = await supabase
          .from('user_invitations')
          .update({
            first_name: handleTextBlur(driverData.first_name),
            last_name: handleTextBlur(driverData.last_name),
            metadata: metadata
          })
          .eq('email', email)
          .eq('role', 'driver')
          .is('accepted_at', null);

        if (invitationError) throw invitationError;

        showSuccess('Invitation information updated successfully');
        onSuccess();
        onClose();
        return;
      }

      // Para conductores ya activados, proceder con la lógica normal
      // Limpiar datos de entrada
      const cleanedData = {
        first_name: handleTextBlur(driverData.first_name),
        last_name: handleTextBlur(driverData.last_name),
        phone: handleTextBlur(driverData.phone),
        driver_id: handleTextBlur(driverData.driver_id),
        license_number: handleTextBlur(driverData.license_number),
        cdl_class: handleTextBlur(driverData.cdl_class),
        license_state: handleTextBlur(driverData.license_state) || null, // Convert empty string to null for foreign key
        emergency_contact_name: handleTextBlur(driverData.emergency_contact_name),
        emergency_contact_phone: handleTextBlur(driverData.emergency_contact_phone),
      };

      // Actualizar perfil básico (incluyendo hire_date y date_of_birth)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: driver.user_id,
          first_name: cleanedData.first_name,
          last_name: cleanedData.last_name,
          phone: cleanedData.phone,
          hire_date: driverData.hire_date ? formatDateForDatabase(driverData.hire_date) : null,
          date_of_birth: driverData.date_of_birth ? formatDateForDatabase(driverData.date_of_birth) : null,
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
          cdl_endorsements: driverData.cdl_endorsements,
          license_state: cleanedData.license_state,
          license_issue_date: driverData.license_issue_date ? formatDateForDatabase(driverData.license_issue_date) : null,
          license_expiry_date: driverData.license_expiry_date ? formatDateForDatabase(driverData.license_expiry_date) : null,
          emergency_contact_name: cleanedData.emergency_contact_name,
          emergency_contact_phone: cleanedData.emergency_contact_phone,
        }, {
          onConflict: 'user_id'
        });

      if (driverError) throw driverError;


      // Gestionar datos de owner operator basándose en el switch
      if (driverData.is_owner_operator) {
        // Crear/actualizar registro de owner operator
        const { error: ownerOperatorError } = await supabase
          .from('owner_operators')
          .upsert({
            user_id: driver.user_id,
            is_active: true,
            business_name: driverData.business_name,
            business_type: driverData.business_type,
            business_address: driverData.business_address,
            business_phone: driverData.business_phone,
            business_email: driverData.business_email,
            tax_id: driverData.tax_id,
            dispatching_percentage: driverData.dispatching_percentage,
            factoring_percentage: driverData.factoring_percentage,
            leasing_percentage: driverData.leasing_percentage,
            insurance_pay: driverData.insurance_pay,
          }, {
            onConflict: 'user_id'
          });

        if (ownerOperatorError) throw ownerOperatorError;
      } else {
        // Desactivar owner operator si existe
        const { error: deactivateError } = await supabase
          .from('owner_operators')
          .update({ is_active: false })
          .eq('user_id', driver.user_id);

        if (deactivateError && deactivateError.code !== 'PGRST116') {
          // PGRST116 significa que no se encontró registro, lo cual está bien
          throw deactivateError;
        }
      }

      showSuccess('Driver information updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving driver data:', error);
      showError('Error saving driver data');
    } finally {
      setSaving(false);
    }
  };

  if (!driver) return null;

  const fullName = `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Driver';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Edit Driver: {fullName}</DialogTitle>
          <DialogDescription>
            Manage all driver information, including personal, employment and owner operator data.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
            <span>Loading driver data...</span>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="employment-license" className="flex items-center gap-2">
                <IdCard className="h-4 w-4" />
                Employment & License
              </TabsTrigger>
              <TabsTrigger value="owner" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Owner Operator
              </TabsTrigger>
            </TabsList>

            {/* Tab Información Personal */}
            <TabsContent value="personal" className="space-y-6 min-h-[400px]">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={driverData.first_name}
                      onChange={(e) => updateDriverData('first_name', e.target.value)}
                      placeholder="First Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={driverData.last_name}
                      onChange={(e) => updateDriverData('last_name', e.target.value)}
                      placeholder="Last Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={driverData.phone}
                      onChange={(e) => {
                        const handlers = createPhoneHandlers((value: string) => updateDriverData('phone', value));
                        handlers.onChange(e);
                      }}
                      onKeyPress={(e) => {
                        const handlers = createPhoneHandlers((value: string) => updateDriverData('phone', value));
                        handlers.onKeyPress(e);
                      }}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <div>
                      <DatePicker
                        id="date_of_birth"
                        selected={driverData.date_of_birth}
                        onChange={(date: Date | null) => updateDriverData('date_of_birth', date)}
                        dateFormat={i18n.language === 'es' ? "dd/MM/yyyy" : "MM/dd/yyyy"}
                        placeholderText="Select date"
                        showYearDropdown
                        showMonthDropdown
                        dropdownMode="select"
                        yearDropdownItemNumber={53}
                        scrollableYearDropdown
                        locale={i18n.language === 'es' ? es : enUS}
                        minDate={new Date(new Date().getFullYear() - 70, 0, 1)}
                        maxDate={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate())}
                        className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md block"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Allowed age: between 18 and 70 years
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-md font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Emergency Contact
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_name">Contact Name</Label>
                      <Input
                        id="emergency_contact_name"
                        value={driverData.emergency_contact_name}
                        onChange={(e) => updateDriverData('emergency_contact_name', e.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                      <Input
                        id="emergency_contact_phone"
                        value={driverData.emergency_contact_phone}
                        onChange={(e) => {
                          const handlers = createPhoneHandlers((value: string) => updateDriverData('emergency_contact_phone', value));
                          handlers.onChange(e);
                        }}
                        onKeyPress={(e) => {
                          const handlers = createPhoneHandlers((value: string) => updateDriverData('emergency_contact_phone', value));
                          handlers.onKeyPress(e);
                        }}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab Empleo y Licencia */}
            <TabsContent value="employment-license" className="space-y-6 min-h-[400px]">
              <div className="space-y-6">
                {/* Sección de Empleo */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <IdCard className="h-5 w-5" />
                    Employment Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="driver_id">Driver ID</Label>
                      <Input
                        id="driver_id"
                        value={driverData.driver_id}
                        onChange={(e) => updateDriverData('driver_id', e.target.value)}
                        placeholder="Unique driver ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hire_date">Hire Date</Label>
                      <div>
                        <DatePicker
                          id="hire_date"
                          selected={driverData.hire_date}
                          onChange={(date: Date | null) => updateDriverData('hire_date', date)}
                          dateFormat={i18n.language === 'es' ? "dd/MM/yyyy" : "MM/dd/yyyy"}
                          placeholderText="Select date"
                          showYearDropdown
                          showMonthDropdown
                          dropdownMode="select"
                          yearDropdownItemNumber={50}
                          scrollableYearDropdown
                          locale={i18n.language === 'es' ? es : enUS}
                          className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md block"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección de Licencia */}
                <LicenseInfoSection
                  data={{
                    license_number: driverData.license_number,
                    license_state: driverData.license_state,
                    license_issue_date: driverData.license_issue_date,
                    license_expiry_date: driverData.license_expiry_date,
                    cdl_class: driverData.cdl_class,
                    cdl_endorsements: driverData.cdl_endorsements,
                  }}
                  onUpdate={(field, value) => updateDriverData(field as keyof DriverData, value)}
                  loading={loading || saving}
                  currentLanguage={i18n.language}
                />
              </div>
            </TabsContent>

            {/* Tab Owner-Operator */}
            <TabsContent value="owner" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Owner Operator
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_owner_operator"
                      checked={driverData.is_owner_operator}
                      onCheckedChange={(checked) => updateDriverData('is_owner_operator', checked)}
                    />
                    <Label htmlFor="is_owner_operator" className="text-sm">
                      {driverData.is_owner_operator ? 'Yes, is Owner Operator' : 'Not an Owner Operator'}
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enable this option if the driver operates with their own vehicle and business.
                  </p>
                </div>

                {/* Sub-tabs cuando es Owner Operator */}
                {driverData.is_owner_operator && (
                  <Tabs value={activeOwnerTab} onValueChange={setActiveOwnerTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="business">Business Data</TabsTrigger>
                      <TabsTrigger value="finance">Financial Configuration</TabsTrigger>
                    </TabsList>

                    <TabsContent value="business" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="business_name">Business Name</Label>
                          <Input
                            id="business_name"
                            value={driverData.business_name}
                            onChange={(e) => updateDriverData('business_name', e.target.value)}
                            placeholder="Driver's business name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="business_type">Business Type</Label>
                          <Input
                            id="business_type"
                            value={driverData.business_type}
                            onChange={(e) => updateDriverData('business_type', e.target.value)}
                            placeholder="LLC, Corporation, etc."
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="business_address">Business Address</Label>
                          <Textarea
                            id="business_address"
                            value={driverData.business_address}
                            onChange={(e) => updateDriverData('business_address', e.target.value)}
                            placeholder="Complete business address"
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="business_phone">Business Phone</Label>
                          <Input
                            id="business_phone"
                            value={driverData.business_phone}
                            onChange={(e) => {
                              const handlers = createPhoneHandlers((value: string) => updateDriverData('business_phone', value));
                              handlers.onChange(e);
                            }}
                            onKeyPress={(e) => {
                              const handlers = createPhoneHandlers((value: string) => updateDriverData('business_phone', value));
                              handlers.onKeyPress(e);
                            }}
                            placeholder="(555) 123-4567"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="business_email">Business Email</Label>
                          <Input
                            id="business_email"
                            type="email"
                            value={driverData.business_email}
                            onChange={(e) => updateDriverData('business_email', e.target.value)}
                            placeholder="business@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tax_id">Tax ID / EIN</Label>
                          <Input
                            id="tax_id"
                            value={driverData.tax_id}
                            onChange={(e) => updateDriverData('tax_id', e.target.value)}
                            placeholder="12-3456789"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="finance" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="dispatching_percentage">Dispatching Percentage (%)</Label>
                          <Input
                            id="dispatching_percentage"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={driverData.dispatching_percentage}
                            onChange={(e) => updateDriverData('dispatching_percentage', parseFloat(e.target.value) || 0)}
                            placeholder="5.00"
                          />
                          <p className="text-xs text-muted-foreground">
                            Percentage charged for dispatching services
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="factoring_percentage">Factoring Percentage (%)</Label>
                          <Input
                            id="factoring_percentage"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={driverData.factoring_percentage}
                            onChange={(e) => updateDriverData('factoring_percentage', parseFloat(e.target.value) || 0)}
                            placeholder="3.00"
                          />
                          <p className="text-xs text-muted-foreground">
                            Percentage charged for factoring services
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="leasing_percentage">Leasing Percentage (%)</Label>
                          <Input
                            id="leasing_percentage"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={driverData.leasing_percentage}
                            onChange={(e) => updateDriverData('leasing_percentage', parseFloat(e.target.value) || 0)}
                            placeholder="5.00"
                          />
                          <p className="text-xs text-muted-foreground">
                            Percentage charged for leasing services
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="insurance_pay">Insurance Payment ($)</Label>
                          <Input
                            id="insurance_pay"
                            type="number"
                            min="0"
                            step="0.01"
                            value={driverData.insurance_pay}
                            onChange={(e) => updateDriverData('insurance_pay', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                          <p className="text-xs text-muted-foreground">
                            Fixed amount for insurance payments
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}