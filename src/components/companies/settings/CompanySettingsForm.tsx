import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Building, User, CreditCard, Settings, 
  Save, RotateCcw, AlertCircle, FileText, 
  MapPin, Phone, Truck, Percent, CalendarDays, Eye
} from "lucide-react";
import { useFleetNotifications } from "@/components/notifications";
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/types/company';
import { CompanyLogoUpload } from '../CompanyLogoUpload';
import { AddressForm } from '@/components/ui/AddressForm';
import { createTextHandlers, createPhoneHandlers, createEINHandlers, createMCHandlers, createDOTHandlers } from '@/lib/textUtils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface CompanySettingsFormProps {
  company: Company;
  onUpdate: (updatedCompany: Company) => void;
}

export function CompanySettingsForm({ company, onUpdate }: CompanySettingsFormProps) {
  const { t } = useTranslation('common');
  const [formData, setFormData] = useState<Company>(company);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const [showPaymentPreview, setShowPaymentPreview] = useState(false);
  const { showSuccess, showError } = useFleetNotifications();

  // Sync formData with company prop changes (e.g., logo updates)
  useEffect(() => {
    setFormData(company);
  }, [company]);

  // Create text handlers for all company fields
  const companyNameHandlers = createTextHandlers((value: string) => handleInputChange('name', value));
  const companyEmailHandlers = createTextHandlers((value: string) => handleInputChange('email', value), 'email');
  const companyPhoneHandlers = createPhoneHandlers((value: string) => handleInputChange('phone', value));
  
  // Documentation field handlers
  const einHandlers = createEINHandlers((value: string) => handleInputChange('ein', value));
  const mcNumberHandlers = createMCHandlers((value: string) => handleInputChange('mc_number', value));
  const dotNumberHandlers = createDOTHandlers((value: string) => handleInputChange('dot_number', value));
  
  // Create text handlers for owner fields
  const ownerNameHandlers = createTextHandlers((value: string) => handleInputChange('owner_name', value));
  const ownerTitleHandlers = createTextHandlers((value: string) => handleInputChange('owner_title', value));
  const ownerEmailHandlers = createTextHandlers((value: string) => handleInputChange('owner_email', value), 'email');
  const ownerPhoneHandlers = createPhoneHandlers((value: string) => handleInputChange('owner_phone', value));

  // Generate preview periods function
  const generatePreviewPeriods = (count: number = 4) => {
    const periods = [];
    let currentDate = new Date();
    
    // Adjust to the correct start day of week
    const dayOfWeek = currentDate.getDay();
    const targetDay = (formData.payment_cycle_start_day || 1) === 7 ? 0 : (formData.payment_cycle_start_day || 1);
    const daysToAdjust = (targetDay - dayOfWeek + 7) % 7;
    currentDate.setDate(currentDate.getDate() + daysToAdjust);

    for (let i = 0; i < count; i++) {
      const periodStart = new Date(currentDate);
      let periodEnd = new Date(currentDate);
      
      switch (formData.default_payment_frequency || 'weekly') {
        case 'weekly':
          periodEnd.setDate(periodEnd.getDate() + 6);
          break;
        case 'biweekly':
          periodEnd.setDate(periodEnd.getDate() + 13);
          break;
        case 'monthly':
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          periodEnd.setDate(periodEnd.getDate() - 1);
          break;
      }

      periods.push({
        start: periodStart,
        end: periodEnd,
        type: 'regular' as const,
      });

      // Move to next period
      switch (formData.default_payment_frequency || 'weekly') {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
    }

    return periods;
  };

  const handleInputChange = (field: keyof Company, value: string | number) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // If state changes, reset city
      if (field === 'state_id') {
        updated.city = undefined;
      }
      
      return updated;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .update({
          name: formData.name,
          ein: formData.ein,
          mc_number: formData.mc_number,
          dot_number: formData.dot_number,
          street_address: formData.street_address,
          state_id: formData.state_id,
          city: formData.city,
          zip_code: formData.zip_code,
          phone: formData.phone,
          email: formData.email,
          owner_name: formData.owner_name,
          owner_email: formData.owner_email,
          owner_phone: formData.owner_phone,
          owner_title: formData.owner_title,
          payment_day: formData.payment_day,
          default_payment_frequency: formData.default_payment_frequency,
          payment_cycle_start_day: formData.payment_cycle_start_day,
          max_users: formData.max_users,
          max_vehicles: formData.max_vehicles,
          logo_url: formData.logo_url,
          default_factoring_percentage: formData.default_factoring_percentage,
          default_dispatching_percentage: formData.default_dispatching_percentage,
          default_leasing_percentage: formData.default_leasing_percentage,
          load_assignment_criteria: formData.load_assignment_criteria,
          updated_at: new Date().toISOString()
        })
        .eq('id', company.id)
        .select()
        .single();

      if (error) throw error;

      onUpdate(data);
      showSuccess(
        "Configuración actualizada",
        "Los cambios se han guardado exitosamente."
      );
    } catch (error) {
      console.error('Error updating company:', error);
      showError(
        "Error",
        "No se pudieron guardar los cambios. Intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(company);
    showSuccess(
      "Formulario restaurado",
      "Se han restaurado los valores originales."
    );
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(company);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('company.settings.title')}</h2>
          <p className="text-muted-foreground">{t('company.settings.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restablecer
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={loading || !hasChanges}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
        <TabsList className="grid w-full grid-cols-3 gap-1 p-1 bg-muted rounded-lg">
          <TabsTrigger 
            value="company" 
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
          >
            <Building className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Empresa</span>
            <span className="sm:hidden">Emp</span>
          </TabsTrigger>
          <TabsTrigger 
            value="documentation" 
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
          >
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Documentación</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger 
            value="contact" 
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
          >
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Ubicación</span>
            <span className="sm:hidden">Ubic</span>
          </TabsTrigger>
          <TabsTrigger 
            value="owner" 
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
          >
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Propietario</span>
            <span className="sm:hidden">Prop</span>
          </TabsTrigger>
          <TabsTrigger 
            value="payments" 
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
          >
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Pagos</span>
            <span className="sm:hidden">Pago</span>
          </TabsTrigger>
          <TabsTrigger 
            value="system" 
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
          >
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Sistema</span>
            <span className="sm:hidden">Sist</span>
          </TabsTrigger>
        </TabsList>

        {/* Información Básica de la Empresa */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Información Básica de la Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload Section */}
              <CompanyLogoUpload
                companyId={company.id}
                currentLogoUrl={formData.logo_url}
                companyName={formData.name}
                onLogoUpdate={(logoUrl) => handleInputChange('logo_url', logoUrl || '')}
              />

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="name">Nombre de la Empresa *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={companyNameHandlers.onChange}
                    onBlur={companyNameHandlers.onBlur}
                    placeholder="Ingresa el nombre de la empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={companyEmailHandlers.onChange}
                    onBlur={companyEmailHandlers.onBlur}
                    placeholder="empresa@ejemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={companyPhoneHandlers.onChange}
                    onKeyPress={companyPhoneHandlers.onKeyPress}
                    placeholder="(XXX) XXX-XXXX"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentación Regulatoria */}
        <TabsContent value="documentation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Documentación y Números Regulatorios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ein">EIN (Tax ID)</Label>
                  <Input
                    id="ein"
                    value={formData.ein || ''}
                    onChange={einHandlers.onChange}
                    onKeyPress={einHandlers.onKeyPress}
                    placeholder="XX-XXXXXXX"
                    maxLength={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mc_number">Número MC</Label>
                  <Input
                    id="mc_number"
                    value={formData.mc_number || ''}
                    onChange={mcNumberHandlers.onChange}
                    onKeyPress={mcNumberHandlers.onKeyPress}
                    placeholder="MC-XXXXXXX"
                    maxLength={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dot_number">Número DOT</Label>
                  <Input
                    id="dot_number"
                    value={formData.dot_number || ''}
                    onChange={dotNumberHandlers.onChange}
                    onKeyPress={dotNumberHandlers.onKeyPress}
                    placeholder="XXXXXXXX"
                    maxLength={8}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ubicación */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Ubicación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Dirección
                </h4>
                <AddressForm
                  streetAddress={formData.street_address}
                  onStreetAddressChange={(value) => handleInputChange('street_address', value)}
                  stateId={formData.state_id}
                  onStateChange={(value) => handleInputChange('state_id', value || '')}
                  city={formData.city}
                  onCityChange={(value) => handleInputChange('city', value)}
                  zipCode={formData.zip_code}
                  onZipCodeChange={(value) => handleInputChange('zip_code', value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Información del Propietario */}
        <TabsContent value="owner">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Información del Propietario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="owner_name">Nombre Completo</Label>
                  <Input
                    id="owner_name"
                    value={formData.owner_name || ''}
                    onChange={ownerNameHandlers.onChange}
                    onBlur={ownerNameHandlers.onBlur}
                    placeholder="Juan Pérez"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_title">Título/Cargo</Label>
                  <Input
                    id="owner_title"
                    value={formData.owner_title || ''}
                    onChange={ownerTitleHandlers.onChange}
                    onBlur={ownerTitleHandlers.onBlur}
                    placeholder="CEO, Presidente, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_email">Email</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    value={formData.owner_email || ''}
                    onChange={ownerEmailHandlers.onChange}
                    onBlur={ownerEmailHandlers.onBlur}
                    placeholder="propietario@empresa.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_phone">Teléfono</Label>
                  <Input
                    id="owner_phone"
                    value={formData.owner_phone || ''}
                    onChange={ownerPhoneHandlers.onChange}
                    onKeyPress={ownerPhoneHandlers.onKeyPress}
                    placeholder="(XXX) XXX-XXXX"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuración de Pagos */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Configuración de Pagos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900">Configuración Crítica</h4>
                    <p className="text-sm text-blue-700">
                      Estos ajustes afectan directamente los pagos a los conductores. 
                      Revisa cuidadosamente antes de guardar cambios.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default_payment_frequency">Frecuencia de Pago</Label>
                  <Select 
                    value={formData.default_payment_frequency || 'weekly'} 
                    onValueChange={(value) => handleInputChange('default_payment_frequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="biweekly">Quincenal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_cycle_start_day">Día de Inicio del Ciclo</Label>
                  <Select 
                    value={formData.payment_cycle_start_day?.toString() || '1'} 
                    onValueChange={(value) => handleInputChange('payment_cycle_start_day', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Lunes</SelectItem>
                      <SelectItem value="2">Martes</SelectItem>
                      <SelectItem value="3">Miércoles</SelectItem>
                      <SelectItem value="4">Jueves</SelectItem>
                      <SelectItem value="5">Viernes</SelectItem>
                      <SelectItem value="6">Sábado</SelectItem>
                      <SelectItem value="7">Domingo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_day">Día de Pago</Label>
                  <Select 
                    value={formData.payment_day || 'friday'} 
                    onValueChange={(value) => handleInputChange('payment_day', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Lunes</SelectItem>
                      <SelectItem value="tuesday">Martes</SelectItem>
                      <SelectItem value="wednesday">Miércoles</SelectItem>
                      <SelectItem value="thursday">Jueves</SelectItem>
                      <SelectItem value="friday">Viernes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview Toggle */}
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Vista Previa de Períodos</h4>
                  <p className="text-sm text-muted-foreground">
                    Ve cómo se verán los próximos períodos con esta configuración
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPaymentPreview(!showPaymentPreview)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showPaymentPreview ? 'Ocultar' : 'Mostrar'} Vista Previa
                </Button>
              </div>

              {/* Preview Periods */}
              {showPaymentPreview && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <h5 className="font-medium flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Próximos Períodos de Pago
                  </h5>
                  <div className="grid gap-2">
                    {generatePreviewPeriods().map((period, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-background rounded border">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            Período {index + 1}
                          </Badge>
                          <span className="text-sm">
                            {format(period.start, 'dd/MM/yyyy', { locale: es })} - {format(period.end, 'dd/MM/yyyy', { locale: es })}
                          </span>
                        </div>
                        <Badge variant="secondary">
                          {(formData.default_payment_frequency || 'weekly') === 'weekly' && '7 días'}
                          {(formData.default_payment_frequency || 'weekly') === 'biweekly' && '14 días'}
                          {(formData.default_payment_frequency || 'weekly') === 'monthly' && 'Mensual'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    * Esta vista previa muestra cómo se generarían los períodos con la configuración actual
                  </p>
                </div>
              )}

              {/* Load Assignment Criteria */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-green-900">Criterio de Asignación de Cargas</h4>
                    <p className="text-sm text-green-700">
                      Selecciona qué fecha utilizar para asignar cargas a períodos de pago
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="delivery_date"
                        name="load_assignment_criteria"
                        value="delivery_date"
                        checked={(formData.load_assignment_criteria || 'delivery_date') === 'delivery_date'}
                        onChange={(e) => handleInputChange('load_assignment_criteria', e.target.value)}
                        className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      <Label htmlFor="delivery_date" className="flex-1 cursor-pointer">
                        <div className="font-medium text-green-900">Fecha de Entrega (Recomendado)</div>
                        <div className="text-sm text-green-700">
                          Asignar cargas basándose en la fecha de entrega. Representa cuando se completa el servicio.
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="pickup_date"
                        name="load_assignment_criteria"
                        value="pickup_date"
                        checked={formData.load_assignment_criteria === 'pickup_date'}
                        onChange={(e) => handleInputChange('load_assignment_criteria', e.target.value)}
                        className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      <Label htmlFor="pickup_date" className="flex-1 cursor-pointer">
                        <div className="font-medium text-green-900">Fecha de Recogida</div>
                        <div className="text-sm text-green-700">
                          Asignar cargas basándose en la fecha de recogida. Representa cuando inicia el servicio.
                        </div>
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner Operator Default Settings */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <Truck className="h-5 w-5 text-amber-600" />
                  <div>
                    <h4 className="font-semibold text-amber-900">Configuración por Defecto - Owner Operators</h4>
                    <p className="text-sm text-amber-700">
                      Estos porcentajes se aplicarán automáticamente a nuevos Owner Operators. Pueden ser modificados individualmente después.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default_leasing_percentage">Leasing (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="default_leasing_percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.default_leasing_percentage || 5.00}
                        onChange={(e) => handleInputChange('default_leasing_percentage', parseFloat(e.target.value) || 0)}
                        placeholder="5.00"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default_factoring_percentage">Factoring (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="default_factoring_percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.default_factoring_percentage || 3.00}
                        onChange={(e) => handleInputChange('default_factoring_percentage', parseFloat(e.target.value) || 0)}
                        placeholder="3.00"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default_dispatching_percentage">Dispatching (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="default_dispatching_percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.default_dispatching_percentage || 5.00}
                        onChange={(e) => handleInputChange('default_dispatching_percentage', parseFloat(e.target.value) || 0)}
                        placeholder="5.00"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuración del Sistema */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Configuración del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_users">Máximo de Usuarios</Label>
                  <Input
                    id="max_users"
                    type="number"
                    min="1"
                    value={formData.max_users || 5}
                    onChange={(e) => handleInputChange('max_users', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_vehicles">Máximo de Vehículos</Label>
                  <Input
                    id="max_vehicles"
                    type="number"
                    min="1"
                    value={formData.max_vehicles || 10}
                    onChange={(e) => handleInputChange('max_vehicles', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Configuraciones Futuras</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    Próximamente estará disponible:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Modo claro/oscuro</li>
                    <li>• Configuración de notificaciones</li>
                    <li>• Personalización de la interfaz</li>
                    <li>• Configuración de reportes automáticos</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}