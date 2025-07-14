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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createTextHandlers, createPhoneHandlers } from '@/lib/textUtils';

// Schema para perfil
const profileSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido'),
  last_name: z.string().min(1, 'El apellido es requerido'),
  phone: z.string().optional(),
  preferred_language: z.string().optional(),
  timezone: z.string().optional(),
});

// Schema para contraseña
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Settings() {
  const { user, userRole } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const { profile, loading: profileLoading, refreshProfile } = useUserProfile();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileSubTab, setProfileSubTab] = useState('info');

  // Form para perfil
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      preferred_language: 'en',
      timezone: 'America/New_York',
    },
  });

  // Form para contraseña
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Helper functions to integrate textUtils with react-hook-form
  const createFormTextHandler = (fieldOnChange: (value: string) => void, type: 'text' | 'email' | 'phone' = 'text') => {
    const handlers = type === 'phone' 
      ? createPhoneHandlers(fieldOnChange)
      : createTextHandlers(fieldOnChange, type);
    
    return {
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        handlers.onChange(e);
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        if ('onBlur' in handlers) {
          handlers.onBlur(e);
        }
      },
      onKeyPress: 'onKeyPress' in handlers ? handlers.onKeyPress : undefined
    };
  };

  useEffect(() => {
    if (user && userRole?.company_id) {
      fetchCompanyData();
    }
  }, [user, userRole]);

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        preferred_language: profile.preferred_language || 'en',
        timezone: profile.timezone || 'America/New_York',
      });
    }
  }, [profile, profileForm]);

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
      showError(
        "Error",
        "No se pudo cargar la información de la empresa."
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmitProfile = async (data: ProfileFormData) => {
    if (!user) return;

    setUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || null,
          preferred_language: data.preferred_language || 'en',
          timezone: data.timezone || 'America/New_York',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshProfile();

      showSuccess(
        "Perfil actualizado",
        "Su información personal ha sido guardada correctamente."
      );
    } catch (error: any) {
      showError(
        "Error",
        error.message || "No se pudo actualizar el perfil."
      );
    } finally {
      setUpdatingProfile(false);
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
    <>
      <PageToolbar 
        title="Configuración"
      />
      <div className="p-6 min-h-screen bg-gradient-subtle">
        {/* Content */}
        <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white shadow-sm border">
            <TabsTrigger 
              value="profile" 
              className="flex items-center gap-2 transition-all duration-200 hover:bg-primary/20 hover:text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <User className="h-4 w-4" />
              Mi Perfil
            </TabsTrigger>
            <TabsTrigger 
              value="company" 
              className="flex items-center gap-2 transition-all duration-200 hover:bg-primary/20 hover:text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Building className="h-4 w-4" />
              Empresa
            </TabsTrigger>
            <TabsTrigger 
              value="system" 
              className="flex items-center gap-2 transition-all duration-200 hover:bg-primary/20 hover:text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Database className="h-4 w-4" />
              Sistema
            </TabsTrigger>
            <TabsTrigger 
              value="interface" 
              className="flex items-center gap-2 transition-all duration-200 hover:bg-primary/20 hover:text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Palette className="h-4 w-4" />
              Interfaz
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="flex items-center gap-2 transition-all duration-200 hover:bg-primary/20 hover:text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Bell className="h-4 w-4" />
              Notificaciones
            </TabsTrigger>
          </TabsList>

          {/* Mi Perfil */}
          <TabsContent value="profile">
            <div className="grid gap-6">
              {/* Self Role Manager - Only for Company Owners */}
              <SelfRoleManager />
              
              <div className="grid gap-6 md:grid-cols-3">
              {/* Profile Summary Card */}
              <Card className="md:col-span-1">
                <CardHeader className="text-center">
                  <AvatarUpload 
                    currentAvatarUrl={profile?.avatar_url}
                    userName={`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()}
                    onAvatarUpdate={async (avatarUrl) => {
                      await refreshProfile();
                    }}
                  />
                  <CardTitle className="text-xl">{profile?.first_name} {profile?.last_name}</CardTitle>
                  <p className="text-muted-foreground">{user?.email}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Teléfono:</span>
                      <span>{profile?.phone || 'No especificado'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Idioma:</span>
                      <span>{profile?.preferred_language === 'es' ? 'Español' : 'English'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Zona horaria:</span>
                      <span>{profile?.timezone || 'America/New_York'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profile Forms */}
              <Card className="md:col-span-2">
                <Tabs value={profileSubTab} onValueChange={setProfileSubTab} className="w-full">
                  <CardHeader>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger 
                        value="info" 
                        className="flex items-center gap-2 transition-all duration-200 hover:bg-secondary/20 hover:text-secondary data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"
                      >
                        <User className="h-4 w-4" />
                        Información Personal
                      </TabsTrigger>
                      <TabsTrigger 
                        value="security" 
                        className="flex items-center gap-2 transition-all duration-200 hover:bg-secondary/20 hover:text-secondary data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"
                      >
                        <Shield className="h-4 w-4" />
                        Seguridad
                      </TabsTrigger>
                    </TabsList>
                  </CardHeader>

                  <CardContent>
                    {/* Información Personal */}
                    <TabsContent value="info" className="space-y-4">
                      <div className="mb-4">
                        <h3 className="text-lg font-medium">Información Personal</h3>
                        <p className="text-sm text-muted-foreground">
                          Actualiza tu información personal y preferencias
                        </p>
                      </div>
                      
                      <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={profileForm.control}
                              name="first_name"
                              render={({ field }) => {
                                const textHandlers = createFormTextHandler(field.onChange);
                                return (
                                  <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Tu nombre" 
                                        value={field.value}
                                        onChange={textHandlers.onChange}
                                        onBlur={textHandlers.onBlur}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />

                            <FormField
                              control={profileForm.control}
                              name="last_name"
                              render={({ field }) => {
                                const textHandlers = createFormTextHandler(field.onChange);
                                return (
                                  <FormItem>
                                    <FormLabel>Apellido</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Tu apellido" 
                                        value={field.value}
                                        onChange={textHandlers.onChange}
                                        onBlur={textHandlers.onBlur}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />
                          </div>

                          <FormField
                            control={profileForm.control}
                            name="phone"
                            render={({ field }) => {
                              const phoneHandlers = createFormTextHandler(field.onChange, 'phone');
                              return (
                                <FormItem>
                                  <FormLabel>Teléfono</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="(555) 123-4567" 
                                      value={field.value || ''} 
                                      onChange={phoneHandlers.onChange}
                                      onKeyPress={phoneHandlers.onKeyPress}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Número de teléfono para contacto (opcional)
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={profileForm.control}
                              name="preferred_language"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Idioma Preferido</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un idioma" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="en">English</SelectItem>
                                      <SelectItem value="es">Español</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={profileForm.control}
                              name="timezone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Zona Horaria</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecciona zona horaria" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="America/New_York">Este (Nueva York)</SelectItem>
                                      <SelectItem value="America/Chicago">Central (Chicago)</SelectItem>
                                      <SelectItem value="America/Denver">Montaña (Denver)</SelectItem>
                                      <SelectItem value="America/Los_Angeles">Pacífico (Los Ángeles)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => profileForm.reset()}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Resetear
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={updatingProfile}
                              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground transition-colors"
                            >
                              {updatingProfile ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                  Actualizando...
                                </>
                              ) : (
                                <>
                                  <Save className="mr-2 h-4 w-4" />
                                  Guardar Cambios
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </TabsContent>

                    {/* Seguridad */}
                    <TabsContent value="security" className="space-y-4">
                      <div className="mb-4">
                        <h3 className="text-lg font-medium">Seguridad de la Cuenta</h3>
                        <p className="text-sm text-muted-foreground">
                          Actualiza tu contraseña para mantener tu cuenta segura
                        </p>
                      </div>

                      <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4 max-w-md">
                          <FormField
                            control={passwordForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Contraseña Actual</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Tu contraseña actual" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={passwordForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nueva Contraseña</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Nueva contraseña" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Debe tener al menos 6 caracteres
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={passwordForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Confirma la nueva contraseña" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-start gap-2">
                            <Button type="button" variant="outline" onClick={() => passwordForm.reset()}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Limpiar
                            </Button>
                            <Button type="submit" disabled={changingPassword} variant="secondary">
                              {changingPassword ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                  Cambiando...
                                </>
                              ) : (
                                <>
                                  <KeyRound className="mr-2 h-4 w-4" />
                                  Cambiar Contraseña
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </TabsContent>
                  </CardContent>
                </Tabs>
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
    </>
  );
}