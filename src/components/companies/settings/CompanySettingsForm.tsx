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
  MapPin, Phone 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/types/company';
import { CompanyLogoUpload } from '../CompanyLogoUpload';
import { AddressForm } from '@/components/ui/AddressForm';

interface CompanySettingsFormProps {
  company: Company;
  onUpdate: (updatedCompany: Company) => void;
}

export function CompanySettingsForm({ company, onUpdate }: CompanySettingsFormProps) {
  const [formData, setFormData] = useState<Company>(company);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const { toast } = useToast();

  const handleInputChange = (field: keyof Company, value: string | number) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // If state changes, reset city
      if (field === 'state_id') {
        updated.city_id = undefined;
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
          city_id: formData.city_id,
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
          updated_at: new Date().toISOString()
        })
        .eq('id', company.id)
        .select()
        .single();

      if (error) throw error;

      onUpdate(data);
      toast({
        title: "Configuración actualizada",
        description: "Los cambios se han guardado exitosamente.",
      });
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(company);
    toast({
      title: "Formulario restaurado",
      description: "Se han restaurado los valores originales.",
    });
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(company);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Configuración de la Empresa</h2>
          <p className="text-muted-foreground">Administra la información y configuración de tu empresa</p>
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
            className="bg-gradient-primary hover:opacity-90"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-white shadow-sm border">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="documentation" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentación
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Ubicación
          </TabsTrigger>
          <TabsTrigger value="owner" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Propietario
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pagos
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Sistema
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
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ingresa el nombre de la empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="empresa@ejemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
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
                    onChange={(e) => handleInputChange('ein', e.target.value)}
                    placeholder="XX-XXXXXXX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mc_number">Número MC</Label>
                  <Input
                    id="mc_number"
                    value={formData.mc_number || ''}
                    onChange={(e) => handleInputChange('mc_number', e.target.value)}
                    placeholder="MC-XXXXXX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dot_number">Número DOT</Label>
                  <Input
                    id="dot_number"
                    value={formData.dot_number || ''}
                    onChange={(e) => handleInputChange('dot_number', e.target.value)}
                    placeholder="XXXXXXX"
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
                  cityId={formData.city_id}
                  onCityChange={(value) => handleInputChange('city_id', value)}
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
                    onChange={(e) => handleInputChange('owner_name', e.target.value)}
                    placeholder="Juan Pérez"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_title">Título/Cargo</Label>
                  <Input
                    id="owner_title"
                    value={formData.owner_title || ''}
                    onChange={(e) => handleInputChange('owner_title', e.target.value)}
                    placeholder="CEO, Presidente, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_email">Email</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    value={formData.owner_email || ''}
                    onChange={(e) => handleInputChange('owner_email', e.target.value)}
                    placeholder="propietario@empresa.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_phone">Teléfono</Label>
                  <Input
                    id="owner_phone"
                    value={formData.owner_phone || ''}
                    onChange={(e) => handleInputChange('owner_phone', e.target.value)}
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
                  <Label htmlFor="payment_day">Día de Pago del Mes</Label>
                  <Select 
                    value={formData.payment_day.toString()} 
                    onValueChange={(value) => handleInputChange('payment_day', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Día {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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