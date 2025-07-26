import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Truck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFleetNotifications } from "@/components/notifications";
import { supabase } from "@/integrations/supabase/client";
import { createPhoneHandlers } from '@/lib/textUtils';

interface DriverData {
  // Driver profile data
  driver_id: string;
  hire_date?: Date | null;
  
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

interface EditDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export function EditDriverModal({ isOpen, onClose, userId, userName }: EditDriverModalProps) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useFleetNotifications();
  const [activeOwnerTab, setActiveOwnerTab] = useState('business');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [driverData, setDriverData] = useState<DriverData>({
    driver_id: '',
    hire_date: null,
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
    if (isOpen && userId) {
      loadDriverData();
    }
  }, [isOpen, userId]);

  const loadDriverData = async () => {
    setLoading(true);
    try {
      // Cargar datos del empleado
      const { data: companyDriver, error: companyDriverError } = await supabase
        .from('company_drivers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (companyDriverError) throw companyDriverError;

      // Cargar perfil del conductor
      const { data: driverProfile, error: driverProfileError } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (driverProfileError) throw driverProfileError;

      // Cargar datos de owner operator
      const { data: ownerOperator, error: ownerOperatorError } = await supabase
        .from('owner_operators')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (ownerOperatorError) throw ownerOperatorError;

      // Valores por defecto estándar (eliminada consulta problemática)
      const defaultValues = {
        default_dispatching_percentage: 5.00,
        default_factoring_percentage: 3.00,
        default_leasing_percentage: 5.00
      };

      // Si ya es un Owner Operator existente, usar sus valores guardados
      const hasExistingOO = ownerOperator && ownerOperator.is_active;

      setDriverData({
        driver_id: driverProfile?.driver_id || '',
        hire_date: driverProfile?.hire_date ? new Date(driverProfile.hire_date) : null,
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
      showError('Error al cargar los datos del conductor');
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
          .eq('user_id', userId)
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
    setSaving(true);
    try {
      // Actualizar campos administrativos del conductor (driver_id y hire_date)
      const { error: driverError } = await supabase
        .from('driver_profiles')
        .upsert({
          user_id: userId,
          driver_id: driverData.driver_id,
          hire_date: driverData.hire_date?.toISOString().split('T')[0] || null,
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
            user_id: userId,
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
          .eq('user_id', userId);

        if (deactivateError && deactivateError.code !== 'PGRST116') {
          // PGRST116 significa que no se encontró registro, lo cual está bien
          throw deactivateError;
        }
      }

      showSuccess('Información del conductor actualizada correctamente');
      onClose();
    } catch (error) {
      console.error('Error saving driver data:', error);
      showError('Error al guardar los datos del conductor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Conductor: {userName}</DialogTitle>
          <DialogDescription>
            Gestiona la información administrativa y comercial del conductor.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
            <span>Cargando datos del conductor...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Información de Empleado */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Información de Empleado
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="driver_id">ID del Conductor</Label>
                  <Input
                    id="driver_id"
                    value={driverData.driver_id}
                    onChange={(e) => updateDriverData('driver_id', e.target.value)}
                    placeholder="ID único asignado por la empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hire_date">Fecha de Contratación</Label>
                  <div>
                    <DatePicker
                      id="hire_date"
                      selected={driverData.hire_date}
                      onChange={(date: Date | null) => updateDriverData('hire_date', date)}
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

            {/* Separador */}
            <div className="border-t border-border"></div>

            {/* Owner-Operator Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Owner-Operator
                </h3>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_owner_operator"
                    checked={driverData.is_owner_operator}
                    onCheckedChange={(checked) => updateDriverData('is_owner_operator', checked)}
                  />
                  <Label htmlFor="is_owner_operator" className="text-sm">
                    {driverData.is_owner_operator ? 'Sí, es Owner Operator' : 'No es Owner Operator'}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Activa esta opción si el conductor opera con su propio vehículo y negocio.
                </p>
              </div>

              {/* Sub-tabs cuando es Owner Operator */}
              {driverData.is_owner_operator && (
                <Tabs value={activeOwnerTab} onValueChange={setActiveOwnerTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="business">Datos del Negocio</TabsTrigger>
                    <TabsTrigger value="finance">Configuración Financiera</TabsTrigger>
                  </TabsList>

                  <TabsContent value="business" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="business_name">Nombre del Negocio</Label>
                        <Input
                          id="business_name"
                          value={driverData.business_name}
                          onChange={(e) => updateDriverData('business_name', e.target.value)}
                          placeholder="Nombre de la empresa del conductor"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="business_type">Tipo de Negocio</Label>
                        <Input
                          id="business_type"
                          value={driverData.business_type}
                          onChange={(e) => updateDriverData('business_type', e.target.value)}
                          placeholder="LLC, Corporation, etc."
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="business_address">Dirección del Negocio</Label>
                        <Textarea
                          id="business_address"
                          value={driverData.business_address}
                          onChange={(e) => updateDriverData('business_address', e.target.value)}
                          placeholder="Dirección completa del negocio"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="business_phone">Teléfono del Negocio</Label>
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
                        <Label htmlFor="business_email">Email del Negocio</Label>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="leasing_percentage">% Leasing</Label>
                        <div className="relative">
                          <Input
                            id="leasing_percentage"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={driverData.leasing_percentage}
                            onChange={(e) => updateDriverData('leasing_percentage', parseFloat(e.target.value) || 0)}
                            className="pr-8"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="factoring_percentage">% Factoring</Label>
                        <div className="relative">
                          <Input
                            id="factoring_percentage"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={driverData.factoring_percentage}
                            onChange={(e) => updateDriverData('factoring_percentage', parseFloat(e.target.value) || 0)}
                            className="pr-8"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dispatching_percentage">% Dispatching</Label>
                        <div className="relative">
                          <Input
                            id="dispatching_percentage"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={driverData.dispatching_percentage}
                            onChange={(e) => updateDriverData('dispatching_percentage', parseFloat(e.target.value) || 0)}
                            className="pr-8"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-3">
                        <Label htmlFor="insurance_pay">Pago de Seguro</Label>
                        <div className="relative">
                          <Input
                            id="insurance_pay"
                            type="number"
                            min="0"
                            step="0.01"
                            value={driverData.insurance_pay}
                            onChange={(e) => updateDriverData('insurance_pay', parseFloat(e.target.value) || 0)}
                            className="pl-8"
                          />
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Monto fijo por período de pago para cobertura de seguro
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
            
            {/* Botones de acción */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-border">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}