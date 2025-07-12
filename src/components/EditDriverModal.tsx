import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DriverData {
  // Employee data
  is_active: boolean;
  termination_date?: Date | null;
  termination_reason: string;
  
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
  const [activeTab, setActiveTab] = useState('employee');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [driverData, setDriverData] = useState<DriverData>({
    is_active: true,
    termination_date: null,
    termination_reason: '',
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

      setDriverData({
        is_active: companyDriver?.is_active ?? true,
        termination_date: companyDriver?.termination_date ? new Date(companyDriver.termination_date) : null,
        termination_reason: companyDriver?.termination_reason || '',
        driver_id: driverProfile?.driver_id || '',
        hire_date: driverProfile?.hire_date ? new Date(driverProfile.hire_date) : null,
        is_owner_operator: ownerOperator ? ownerOperator.is_active : false,
        business_name: ownerOperator?.business_name || '',
        business_type: ownerOperator?.business_type || '',
        business_address: ownerOperator?.business_address || '',
        business_phone: ownerOperator?.business_phone || '',
        business_email: ownerOperator?.business_email || '',
        tax_id: ownerOperator?.tax_id || '',
        dispatching_percentage: ownerOperator?.dispatching_percentage || 0,
        factoring_percentage: ownerOperator?.factoring_percentage || 0,
        leasing_percentage: ownerOperator?.leasing_percentage || 0,
        insurance_pay: ownerOperator?.insurance_pay || 0,
      });
    } catch (error) {
      console.error('Error loading driver data:', error);
      toast.error('Error al cargar los datos del conductor');
    } finally {
      setLoading(false);
    }
  };

  const updateDriverData = (field: keyof DriverData, value: any) => {
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

      // Actualizar información de empleado (administrativa)
      const { error: companyDriverError } = await supabase
        .from('company_drivers')
        .upsert({
          user_id: userId,
          is_active: driverData.is_active,
          termination_date: driverData.termination_date?.toISOString().split('T')[0] || null,
          termination_reason: driverData.termination_reason,
        }, {
          onConflict: 'user_id'
        });

      if (companyDriverError) throw companyDriverError;

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

      toast.success('Información del conductor actualizada correctamente');
      onClose();
    } catch (error) {
      console.error('Error saving driver data:', error);
      toast.error('Error al guardar los datos del conductor');
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="employee">Empleado</TabsTrigger>
                <TabsTrigger value="owner-operator">Owner-Operator</TabsTrigger>
              </TabsList>

              <TabsContent value="employee" className="space-y-6">
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
                    <Label>Fecha de Contratación</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !driverData.hire_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {driverData.hire_date ? (
                            format(driverData.hire_date, "PPP", { locale: es })
                          ) : (
                            <span>Seleccionar fecha</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={driverData.hire_date || undefined}
                          onSelect={(date) => updateDriverData('hire_date', date)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="is_active">Estado del Empleado</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={driverData.is_active}
                        onCheckedChange={(checked) => updateDriverData('is_active', checked)}
                      />
                      <span className="text-sm">
                        {driverData.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>

                  {!driverData.is_active && (
                    <>
                      <div className="space-y-2">
                        <Label>Fecha de Terminación</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !driverData.termination_date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {driverData.termination_date ? (
                                format(driverData.termination_date, "PPP", { locale: es })
                              ) : (
                                <span>Seleccionar fecha</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={driverData.termination_date || undefined}
                              onSelect={(date) => updateDriverData('termination_date', date)}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="termination_reason">Razón de Terminación</Label>
                        <Input
                          id="termination_reason"
                          value={driverData.termination_reason}
                          onChange={(e) => updateDriverData('termination_reason', e.target.value)}
                          placeholder="Motivo de la terminación del contrato"
                        />
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="owner-operator" className="space-y-6">
                <div className="space-y-2 mb-6">
                  <Label htmlFor="is_owner_operator">¿Es Owner Operator?</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_owner_operator"
                      checked={driverData.is_owner_operator}
                      onCheckedChange={(checked) => updateDriverData('is_owner_operator', checked)}
                    />
                    <span className="text-sm">
                      {driverData.is_owner_operator ? 'Sí, es Owner Operator' : 'No es Owner Operator'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Activa esta opción si el conductor opera con su propio vehículo y negocio.
                  </p>
                </div>

                {driverData.is_owner_operator && (
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
                      onChange={(e) => updateDriverData('business_phone', e.target.value)}
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
                    <Label htmlFor="tax_id">Tax ID</Label>
                    <Input
                      id="tax_id"
                      value={driverData.tax_id}
                      onChange={(e) => updateDriverData('tax_id', e.target.value)}
                      placeholder="EIN o SSN"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insurance_pay">Pago de Seguro ($)</Label>
                    <Input
                      id="insurance_pay"
                      type="number"
                      step="0.01"
                      min="0"
                      value={driverData.insurance_pay}
                      onChange={(e) => updateDriverData('insurance_pay', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <h4 className="text-lg font-medium mb-4">Porcentajes de Comisión</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dispatching_percentage">Dispatching (%)</Label>
                        <Input
                          id="dispatching_percentage"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={driverData.dispatching_percentage}
                          onChange={(e) => updateDriverData('dispatching_percentage', parseFloat(e.target.value) || 0)}
                          placeholder="5.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="factoring_percentage">Factoring (%)</Label>
                        <Input
                          id="factoring_percentage"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={driverData.factoring_percentage}
                          onChange={(e) => updateDriverData('factoring_percentage', parseFloat(e.target.value) || 0)}
                          placeholder="3.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="leasing_percentage">Leasing (%)</Label>
                        <Input
                          id="leasing_percentage"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={driverData.leasing_percentage}
                          onChange={(e) => updateDriverData('leasing_percentage', parseFloat(e.target.value) || 0)}
                          placeholder="5.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={saving}>
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