import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { User, Settings, Save, KeyRound, CheckCircle, AlertCircle, RotateCcw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createTextHandlers } from '@/lib/textUtils';

const profileSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido'),
  last_name: z.string().min(1, 'El apellido es requerido'),
  phone: z.string().optional(),
  preferred_language: z.string().optional(),
  timezone: z.string().optional(),
});

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

export default function Profile() {
  const { t, i18n } = useTranslation(['common']);
  const { toast } = useToast();
  const { profile, loading, user, getUserInitials, refreshProfile } = useUserProfile();
  const [updating, setUpdating] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Create handlers for text inputs
  const nameHandlers = createTextHandlers((value) => 
    profileForm.setValue('first_name', value)
  );
  
  const lastNameHandlers = createTextHandlers((value) => 
    profileForm.setValue('last_name', value)
  );
  
  const phoneHandlers = createTextHandlers((value) => 
    profileForm.setValue('phone', value), 'phone'
  );

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

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

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

  const onSubmitProfile = async (data: ProfileFormData) => {
    if (!user) return;

    setUpdating(true);
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

      // Update i18n language if changed
      if (data.preferred_language && data.preferred_language !== i18n.language) {
        i18n.changeLanguage(data.preferred_language);
      }

      // Refresh profile data to update the UI
      await refreshProfile();

      toast({
        title: "✅ Perfil actualizado exitosamente",
        description: "Su información personal ha sido guardada correctamente.",
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "❌ Error en la actualización",
        description: error.message || "No se ha podido completar la actualización del perfil. Por favor, inténtelo nuevamente.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const onCancelProfile = () => {
    if (profile) {
      profileForm.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        preferred_language: profile.preferred_language || 'en',
        timezone: profile.timezone || 'America/New_York',
      });
      toast({
        title: "🔄 Cambios descartados",
        description: "Los valores originales han sido restaurados correctamente.",
      });
    }
  };

  const onCancelPassword = () => {
    passwordForm.reset({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    toast({
      title: "🗑️ Campos limpiados",
      description: "Los campos de contraseña han sido reiniciados correctamente.",
    });
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

      toast({
        title: "🔐 Contraseña actualizada exitosamente",
        description: "Su contraseña ha sido modificada de manera segura.",
        variant: "success",
      });

      passwordForm.reset();
    } catch (error: any) {
      toast({
        title: "❌ Error al cambiar contraseña",
        description: error.message || "No se ha podido completar el cambio de contraseña. Por favor, verifique la información e inténtelo nuevamente.",
        variant: "destructive",
      });
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
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Mi Perfil</h1>
        <p className="text-muted-foreground">Gestiona tu información personal y configuraciones de cuenta</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Summary Card */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-xl">{profile?.first_name} {profile?.last_name}</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
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

        {/* Profile Information Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
            <CardDescription>
              Actualiza tu información personal y preferencias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Tu nombre" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellido</FormLabel>
                        <FormControl>
                          <Input placeholder="Tu apellido" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={profileForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(555) 123-4567" 
                          value={field.value || ''} 
                          {...phoneHandlers}
                        />
                      </FormControl>
                      <FormDescription>
                        Número de teléfono para contacto (opcional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="preferred_language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Idioma Preferido</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <Button type="button" variant="outline" onClick={onCancelProfile}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updating}>
                    {updating ? (
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
          </CardContent>
        </Card>

        {/* Password Change Form */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Cambiar Contraseña
            </CardTitle>
            <CardDescription>
              Actualiza tu contraseña para mantener tu cuenta segura
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  <Button type="button" variant="outline" onClick={onCancelPassword}>
                    Cancelar
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}