import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useFleetNotifications } from '@/components/notifications';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { PreferencesForm } from '@/components/profile/PreferencesForm';
import { PageToolbar } from '@/components/layout/PageToolbar';
import { supabase } from '@/integrations/supabase/client';
import { User, Settings, Save, KeyRound, CheckCircle, AlertCircle, RotateCcw, Trash2, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Profile() {
  const { t } = useTranslation(['common']);
  const navigate = useNavigate();
  const { isSuperAdmin, isCompanyOwner, isOperationsManager, isDispatcher, isDriver } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const { profile, loading, user, refreshProfile } = useUserProfile();
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingCancelAction, setPendingCancelAction] = useState<'profile' | 'password' | null>(null);

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Función para obtener la ruta del dashboard según el rol del usuario
  const getDashboardRoute = () => {
    if (isSuperAdmin) return '/superadmin';
    if (isCompanyOwner) return '/dashboard/owner';
    if (isOperationsManager) return '/dashboard/operations';
    if (isDispatcher) return '/dashboard/dispatch';
    if (isDriver) return '/dashboard/driver';
    return '/'; // Fallback
  };

  // Función para manejar la confirmación de cancelar
  const handleCancelConfirmation = () => {
    if (pendingCancelAction === 'password') {
      // Resetear formulario de contraseña
      passwordForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
    
    // Navegar al dashboard
    navigate(getDashboardRoute());
    
    // Limpiar estados
    setShowCancelModal(false);
    setPendingCancelAction(null);
  };

  const onCancelProfile = () => {
    navigate(getDashboardRoute());
  };

  const onCancelPassword = () => {
    // Solo mostrar modal de confirmación si hay cambios sin guardar
    if (passwordForm.formState.isDirty) {
      setPendingCancelAction('password');
      setShowCancelModal(true);
    } else {
      // Si no hay cambios, ir directamente al dashboard
      navigate(getDashboardRoute());
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
        "Contraseña actualizada exitosamente",
        "Su contraseña ha sido modificada de manera segura."
      );

      passwordForm.reset();
    } catch (error: any) {
      showError(
        "Error al cambiar contraseña",
        error.message || "No se ha podido completar el cambio de contraseña. Por favor, verifique la información e inténtelo nuevamente."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageToolbar 
        icon={User}
        title="Mi Perfil"
        subtitle="Gestiona tu información personal y configuración de cuenta"
      />
      <div className="container mx-auto p-3 md:p-6 max-w-6xl">
        <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
          {/* Profile Summary Card */}
          <Card className="lg:col-span-1 order-2 lg:order-1">
            <CardHeader className="text-center p-4 md:p-6">
              <AvatarUpload 
                currentAvatarUrl={profile?.avatar_url}
                userName={`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()}
                onAvatarUpdate={async (avatarUrl) => {
                  // Refresh profile to get updated data
                  await refreshProfile();
                }}
              />
              <CardTitle className="text-lg md:text-xl mt-4">{profile?.first_name} {profile?.last_name}</CardTitle>
              <CardDescription className="text-sm">{user?.email}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-3 text-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-muted-foreground font-medium">Teléfono:</span>
                  <span className="text-foreground">{profile?.phone || 'No especificado'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-muted-foreground font-medium">Idioma:</span>
                  <span className="text-foreground">{profile?.preferred_language === 'es' ? 'Español' : 'English'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-muted-foreground font-medium">Zona horaria:</span>
                  <span className="text-foreground">{profile?.timezone || 'America/New_York'}</span>
                </div>
                {(profile?.street_address || profile?.zip_code) && (
                  <div className="pt-2 border-t">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground font-medium">Dirección:</span>
                      <div className="text-foreground text-xs leading-relaxed">
                        {profile?.street_address && (
                          <div>{profile.street_address}</div>
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

          {/* Tabs for Profile Information and Security */}
          <Card className="lg:col-span-2 order-1 lg:order-2">
            <Tabs defaultValue="profile" className="w-full">
              <CardHeader className="p-4 md:p-6">
                <TabsList className="grid w-full grid-cols-3 h-auto">
                  <TabsTrigger 
                    value="profile" 
                    className="flex items-center gap-2 text-xs md:text-sm py-2 px-2 md:px-4 transition-all duration-200 hover:bg-secondary/20 hover:text-secondary data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"
                  >
                    <User className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Información Personal</span>
                    <span className="sm:hidden">Info</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="preferences" 
                    className="flex items-center gap-2 text-xs md:text-sm py-2 px-2 md:px-4 transition-all duration-200 hover:bg-secondary/20 hover:text-secondary data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"
                  >
                    <Settings className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Preferencias</span>
                    <span className="sm:hidden">Pref</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="security" 
                    className="flex items-center gap-2 text-xs md:text-sm py-2 px-2 md:px-4 transition-all duration-200 hover:bg-secondary/20 hover:text-secondary data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"
                  >
                    <Shield className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Seguridad</span>
                    <span className="sm:hidden">Seguridad</span>
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="p-4 md:p-6">
                <TabsContent value="profile" className="space-y-4 mt-0">
                  <ProfileForm onCancel={onCancelProfile} />
                </TabsContent>

                <TabsContent value="preferences" className="space-y-4 mt-0">
                  <PreferencesForm onCancel={onCancelProfile} />
                </TabsContent>

                <TabsContent value="security" className="space-y-4 mt-0">
                  <div className="mb-4">
                    <h3 className="text-base md:text-lg font-medium">Seguridad de la Cuenta</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
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
                            <FormLabel className="text-sm font-medium">Contraseña Actual</FormLabel>
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
                            <FormLabel className="text-sm font-medium">Nueva Contraseña</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Nueva contraseña" {...field} />
                            </FormControl>
                            <FormDescription className="text-xs">
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
                            <FormLabel className="text-sm font-medium">Confirmar Nueva Contraseña</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirma la nueva contraseña" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex flex-col sm:flex-row justify-start gap-2">
                        <Button type="button" variant="outline" onClick={onCancelPassword} className="w-full sm:w-auto">
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={changingPassword} variant="secondary" className="w-full sm:w-auto">
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

        {/* Modal de confirmación para cancelar */}
        <AlertDialog open={showCancelModal} onOpenChange={setShowCancelModal}>
          <AlertDialogContent className="mx-4 max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base">¿Descartar cambios?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm">
                Se limpiarán todos los campos de contraseña y serás redirigido a tu dashboard.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel onClick={() => setShowCancelModal(false)} className="w-full sm:w-auto">
                Continuar editando
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelConfirmation} className="bg-destructive hover:bg-destructive/90 w-full sm:w-auto">
                Sí, descartar y salir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}