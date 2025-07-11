import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Settings as SettingsIcon, Building, User, Moon, Sun, Bell, Shield, 
  Globe, Palette, Monitor, Database
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CompanySettingsForm } from '@/components/companies/settings/CompanySettingsForm';
import { Company } from '@/types/company';

export default function Settings() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);

  useEffect(() => {
    if (user && userRole?.company_id) {
      fetchCompanyData();
    }
  }, [user, userRole]);

  const fetchCompanyData = async () => {
    if (!userRole?.company_id) return;
    
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userRole.company_id)
        .single();

      if (error) throw error;
      setCompanyInfo(data);
    } catch (error) {
      console.error('Error fetching company data:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información de la empresa.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando configuración...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-primary text-white shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24"></div>
        </div>
        
        <div className="relative p-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-full">
              <SettingsIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-heading font-bold mb-2 animate-fade-in text-white">
                Configuración
              </h1>
              <p className="text-white font-body text-lg">
                Administra las configuraciones de tu empresa y sistema
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm border">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Sistema
            </TabsTrigger>
            <TabsTrigger value="interface" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Interfaz
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificaciones
            </TabsTrigger>
          </TabsList>

          {/* Configuración de Empresa */}
          <TabsContent value="company">
            {companyInfo && (
              <CompanySettingsForm 
                company={companyInfo} 
                onUpdate={setCompanyInfo}
              />
            )}
          </TabsContent>

          {/* Configuración del Sistema */}
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Configuración del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Configuraciones de seguridad */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <Shield className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Seguridad y Acceso</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configuraciones de seguridad y control de acceso para tu empresa.
                    </p>
                    <Button variant="outline">
                      Configurar Seguridad
                    </Button>
                  </div>

                  {/* Configuraciones de integración */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <Globe className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Integraciones</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configura integraciones con sistemas externos como Geotab, contabilidad, etc.
                    </p>
                    <Button variant="outline">
                      Gestionar Integraciones
                    </Button>
                  </div>

                  {/* Próximamente */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Próximamente</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Configuración de backups automáticos</li>
                      <li>• Configuración de auditoría</li>
                      <li>• Configuración de API</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuración de Interfaz */}
          <TabsContent value="interface">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Personalización de la Interfaz
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Tema */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <Monitor className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Tema de la Aplicación</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Elige entre modo claro, oscuro o automático según tu preferencia.
                    </p>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <button className="p-4 border rounded-lg hover:border-primary transition-colors">
                        <Sun className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                        <p className="text-sm font-medium">Claro</p>
                      </button>
                      <button className="p-4 border rounded-lg hover:border-primary transition-colors border-primary bg-primary/5">
                        <Moon className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                        <p className="text-sm font-medium">Oscuro</p>
                      </button>
                      <button className="p-4 border rounded-lg hover:border-primary transition-colors">
                        <Monitor className="h-6 w-6 mx-auto mb-2 text-gray-500" />
                        <p className="text-sm font-medium">Automático</p>
                      </button>
                    </div>
                  </div>

                  {/* Próximamente */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Próximamente</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Personalización de colores</li>
                      <li>• Configuración de dashboard</li>
                      <li>• Widgets personalizados</li>
                      <li>• Idioma y localización</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuración de Notificaciones */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Configuración de Notificaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-3">Notificaciones por Email</h4>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm">Reportes financieros semanales</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm">Alertas de vencimiento de documentos</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Notificaciones de carga completada</span>
                      </label>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-3">Notificaciones Push</h4>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm">Emergencias y alertas críticas</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Nuevos mensajes y comunicaciones</span>
                      </label>
                    </div>
                  </div>

                  {/* Próximamente */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Próximamente</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Notificaciones SMS</li>
                      <li>• Configuración de horarios</li>
                      <li>• Notificaciones personalizadas</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}