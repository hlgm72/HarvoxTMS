import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Settings as SettingsIcon, Building, User, Moon, Sun, Bell, Shield, 
  Globe, Palette, Monitor, Database, Save, RotateCcw, KeyRound
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { CompanySettingsForm } from '@/components/companies/settings/CompanySettingsForm';
import { SelfRoleManager } from '@/components/owner/SelfRoleManager';
import { PageToolbar } from '@/components/layout/PageToolbar';
import { Company } from '@/types/company';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

// Schema para contraseña
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Settings() {
  const { t } = useTranslation('common');
  const { user, userRole } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const { profile, loading: profileLoading, refreshProfile } = useUserProfile();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  

  // Form para contraseña
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (user && userRole?.company_id) {
      fetchCompanyData();
    }
  }, [user, userRole]);

  const fetchCompanyData = async () => {
    if (!userRole?.company_id) return;
    
    try {
      // Use secure RPC function for company data
      const { data, error } = await supabase
        .rpc('get_companies_financial_data', {
          target_company_id: userRole.company_id
        })
        .then(result => ({
          data: result.data?.[0] || null,
          error: result.error
        }));

      if (error) throw error;
      setCompanyInfo(data);
    } catch (error) {
      console.error('Error fetching company data:', error);
      showError(
        "Error",
        "No se pudo cargar la información de la empresa."
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmitPassword = async (data: PasswordFormData) => {
    setChangingPassword(true);
    try {
      // First verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: data.currentPassword,
      });

      if (signInError) {
        throw new Error('La contraseña actual ingresada es incorrecta. Por favor, verifíquela.');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) throw updateError;

      showSuccess(
        "Contraseña actualizada",
        "Su contraseña ha sido modificada de manera segura."
      );

      passwordForm.reset();
    } catch (error: any) {
      showError(
        "Error al cambiar contraseña",
        error.message || "No se pudo cambiar la contraseña."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="p-2 md:p-4">
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
    <div className="p-2 md:p-4">
      <PageToolbar 
        icon={SettingsIcon}
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
      />
      <div className="min-h-screen bg-gradient-subtle">
        {/* Content */}
        <div className="space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid gap-1 p-1 bg-muted rounded-lg grid-cols-3 lg:grid-cols-5">
            <TabsTrigger 
              value="profile"
              className="flex items-center justify-center gap-2 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
            >
              <User className="h-4 w-4" />
              <span className="text-xs md:text-sm">{t('settings.tabs.profile')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="company"
              className="flex items-center justify-center gap-2 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
            >
              <Building className="h-4 w-4" />
              <span className="text-xs md:text-sm">{t('settings.tabs.company')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="system"
              className="flex items-center justify-center gap-2 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
            >
              <Database className="h-4 w-4" />
              <span className="text-xs md:text-sm">{t('settings.tabs.system')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="interface"
              className="flex items-center justify-center gap-2 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
            >
              <Palette className="h-4 w-4" />
              <span className="text-xs md:text-sm">{t('settings.tabs.interface')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="notifications"
              className="flex items-center justify-center gap-2 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
            >
              <Bell className="h-4 w-4" />
              <span className="text-xs md:text-sm">{t('settings.tabs.notifications')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Mi Perfil */}
          <TabsContent value="profile" className="space-y-8">
            <div className="grid gap-8">
              {/* Self Role Manager - Only for Company Owners */}
              <div className="mb-8">
                <SelfRoleManager />
              </div>
              
              <div className="grid gap-8 md:grid-cols-3">
                {/* Profile Summary Card */}
                <Card className="md:col-span-1">
                  <CardHeader className="text-center pb-4">
                    <AvatarUpload 
                      currentAvatarUrl={profile?.avatar_url}
                      userName={`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()}
                      onAvatarUpdate={async (avatarUrl) => {
                        await refreshProfile();
                      }}
                    />
                    <CardTitle className="text-xl mt-4">{profile?.first_name} {profile?.last_name}</CardTitle>
                    <p className="text-muted-foreground">{user?.email}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-muted-foreground">Teléfono:</span>
                        <span className="font-medium">{profile?.phone || 'No especificado'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-muted-foreground">Idioma:</span>
                        <span className="font-medium">{profile?.preferred_language === 'es' ? 'Español' : 'English'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-muted-foreground">Zona horaria:</span>
                        <span className="font-medium">{profile?.timezone || 'America/New_York'}</span>
                      </div>
                      {(profile?.street_address || profile?.zip_code) && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex flex-col gap-2">
                            <span className="text-muted-foreground font-medium">Dirección:</span>
                            <div className="text-foreground text-sm leading-relaxed">
                              {profile?.street_address && (
                                <div className="mb-1">{profile.street_address}</div>
                              )}
                              {profile?.zip_code && (
                                <div>{profile.zip_code}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Profile Form */}
                <Card className="md:col-span-2">
                  <CardContent className="p-8">
                    <ProfileForm showCancelButton={false} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

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
    </div>
  );
}